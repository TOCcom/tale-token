// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ITaleHero is IERC721 {
    function isLocked(uint256 tokenId) external view returns (bool);
}

contract HeroStaking is Ownable, ERC721Holder {
    using SafeERC20 for IERC20;
    
    uint256 public constant CALCULATION_PERIOD = 300;

    struct Staking {
        uint256 timestamp;
        uint256 lastReward;
        uint256 rewarded;
        address hero;
        uint256 tokenId;
        bool isCompleted;
        bool isInitialized;
    }

    struct UserStaking {
        mapping(uint256 => Staking) stakings;
        mapping(uint256 => bool) activeStakings;
        uint256 stakingNumber;
    }

    mapping(address => UserStaking) private stakers;
    mapping(address => bool) public allowedHeroes;
    uint256 public totalStaked;
    uint256 public talePerNftAndPeriod;
    IERC20 public taleToken;

    event Stake(address indexed staker, address hero, uint256 tokenId);
    event Reward(address indexed staker, uint256 rewards);
    event Unstake(address indexed staker, address hero, uint256 tokenId);
    
    constructor(address _taleToken, uint256 _talePerNftAndPeriod) {
        taleToken = IERC20(_taleToken);
        talePerNftAndPeriod = _talePerNftAndPeriod;
    }

    /**
    * @notice Starts a new staking.
    *
    * @param hero Hero address for staking.
    * @param tokenId Hero id for staking.
    */
    function stake(address hero, uint256 tokenId) external {
        require(allowedHeroes[hero], "TaleStaking: Can't stake this hero in this pool");
        address staker = _msgSender();
        ITaleHero heroContract = ITaleHero(hero);
        require(!heroContract.isLocked(tokenId), "TaleStaking: Can't stake locked hero");
        require(heroContract.ownerOf(tokenId) == staker, "TaleStaking: Only owner can stake hero");
        require(heroContract.getApproved(tokenId) == address(this), "TaleStaking: Token not allowed for this pool");

        uint stakingId = stakers[staker].stakingNumber;
        stakers[staker].stakingNumber = stakingId + 1;
        stakers[staker].activeStakings[stakingId] = true;
        stakers[staker].stakings[stakingId] = Staking(block.timestamp, block.timestamp, 0, hero, tokenId, false, true);

        totalStaked++;
        heroContract.safeTransferFrom(staker, address(this), tokenId);  

        emit Stake(staker, hero, tokenId);
    }

    /**
     * @notice Pays out rewars and returns staked heroes.
     *
     * @param stakingId Index of user staking for unstake.
     */
    function unstake(uint256 stakingId) external {
        address staker = _msgSender();
        Staking storage staking = stakers[staker].stakings[stakingId]; 
        require(staking.isInitialized, "TaleStaking: Staking is not exists");
        require(!staking.isCompleted, "TaleStaking: Staking is completed");
        _claim(staker, staking);
        staking.isCompleted = true;
        delete stakers[staker].activeStakings[stakingId];

        totalStaked--;

        ITaleHero heroContract = ITaleHero(staking.hero);
        heroContract.transferFrom(address(this), staker, staking.tokenId);  

        emit Unstake(staker, staking.hero, staking.tokenId);
    }

    /**
    * @notice Pays staking rewards.
    *
    * @param stakingId Id of staking;
    */
    function claim(uint256 stakingId) external {
        address staker = _msgSender();
        Staking storage staking = stakers[staker].stakings[stakingId];   
        require(staking.isInitialized, "TaleStaking: Staking is not exists");
        require(!staking.isCompleted, "TaleStaking: Staking is completed");    
        _claim(staker, staking);
    }

    /**
    * @notice Pays staking rewards.
    *
    * @param staker Staker address.
    * @param staking User staking.
    */
    function _claim(address staker, Staking storage staking) private {
        uint256 reward = _getStakingReward(staking);
        staking.rewarded += reward;
        staking.lastReward = block.timestamp;
        taleToken.safeTransfer(staker, reward);

        emit Reward(staker, reward);   
    }

    /**
    * @notice Returns the current rewards available for a claim
    *
    * @param staking User staking.
    */
    function _getStakingReward(Staking storage staking) private view returns(uint256) {
        require(staking.isInitialized, "TaleStaking: Staking is not exists");
        require(!staking.isCompleted, "TaleStaking: Staking is compeleted");
        require(block.timestamp >= staking.lastReward, "TaleStaking: Already rewarded");

        uint256 period = block.timestamp - staking.lastReward;
        uint256 periods = period / CALCULATION_PERIOD;
        return talePerNftAndPeriod * periods;
    }

    /**
    * @notice Withdraws tokens from the pool. 
    *         Available only to the owner of the contract.
    *
    * @param to Address where tokens will be withdrawn
    * @param amount Amount of tokens to withdraw.
    */
    function withdraw(address to, uint256 amount) external onlyOwner {
        require(getPoolSize() >= amount, "TaleStaking: Owner can't withdraw more than pool size");
        taleToken.safeTransfer(to, amount);
    }
    
    /**
    * @notice Sets TALE amount per Hero and period for rewards calculation
    *
    * @param value TALE amount
    */
    function setTalePerNftAndPeriod(uint256 value) external onlyOwner {
        talePerNftAndPeriod = value;
    }

    /**
    * @notice Sets the permissions for hero staking in this pool
    *         Available only to the owner of the contract.
    *
    * @param heroContract Hero address
    * @param allowed Flag to enable or disable staking for the specified hero
    */
    function setHeroAllowance(address heroContract, bool allowed) external onlyOwner {
        allowedHeroes[heroContract] = allowed;
    }

    /**
    * @notice Returns the current number of TALE tokens in the pool
    */
    function getPoolSize() public view returns(uint256) {
        return taleToken.balanceOf(address(this));
    }

    /**
    * @notice Returns active staking indexes for the specified user
    *
    * @param user Address for which indexes will be returned
    */
    function getActiveStakingIndexes(address user) external view returns(uint256[] memory) {
        uint256 activeStakingsCount = getActiveStakingCount(user);
        uint256[] memory result = new uint256[](activeStakingsCount);
        uint256 j = 0;
        for (uint256 i = 0; i < stakers[user].stakingNumber; ++i) {
            if (stakers[user].activeStakings[i]) {
                result[j] = i;
                ++j;
            }
        }
        return result;
    }

    /**
    * @notice Returns staking for the specified user and index
    *
    * @param user Address for which indexes will be returned
    * @param stakingIndex Index of the staking
    */
    function getStaking(address user, uint256 stakingIndex) external view returns(Staking memory) {
        Staking memory staking = stakers[user].stakings[stakingIndex];        
        require(staking.isInitialized, "TaleStaking: Staking is not exists");
        return staking;
    }

   /**
    * @notice Returns the number of all stakings for the user
    *
    * @param user The user whose number of stakings will be returned
    */
    function getAllStakingCount(address user) public view returns(uint256) {
        return stakers[user].stakingNumber;
    }

   /**
    * @notice Returns the number of active stakings for the user
    *
    * @param user The user whose number of stakings will be returned
    */
    function getActiveStakingCount(address user) public view returns(uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < stakers[user].stakingNumber; ++i) {
            if (stakers[user].activeStakings[i]) {
                ++count;
            }
        }
        return count;
    }
}