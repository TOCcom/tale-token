// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMinterFactory {
    function mintTo(address to, address tokenAddress) external;
}

contract ComboStaking is Ownable {

    uint256 public constant MIN_STAKING_VALUE = 25000 * 10 ** 18;    
    
    enum StakingLevel {
        SIMPLE,
        UNCOMMON,
        RARE,
        EPIC,
        LEGENDARY
    }

    struct RewardRule {
        uint256 apr;
        uint256 period;
        address nftHero;
    }

    struct Staking {
        uint256 timestamp;
        uint256 amount;
        uint256 rewarded;
        StakingLevel targetLevel;
        StakingLevel rewardedLevel;
        bool isCompleted;
        bool isInitialized;
    }

    struct UserStaking {
        mapping(uint256 => Staking) stakings;
        mapping(uint256 => bool) activeStakings;
        uint256 stakingNumber;
    }

    mapping(address => UserStaking) private stakers;
    mapping(StakingLevel => RewardRule) public rewardRules;

    uint256 public totalStaked;
    IERC20 public taleToken;
    IMinterFactory public minterFactory;

    event Stake(address indexed staker, uint256 amount, StakingLevel targetLevel);
    event TaleReward(address indexed staker, uint256 amount, uint256 reward);
    event NftReward(address indexed staker, address taleHero);
    
    constructor(address _taleToken, address _minterFactory) {
        taleToken = IERC20(_taleToken);
        minterFactory = IMinterFactory(_minterFactory);
        rewardRules[StakingLevel.SIMPLE] = RewardRule(30, 15 days, address(0));
        rewardRules[StakingLevel.UNCOMMON] = RewardRule(50, 30 days, address(0));
        rewardRules[StakingLevel.RARE] = RewardRule(70, 50 days, address(0));
        rewardRules[StakingLevel.EPIC] = RewardRule(90, 75 days, address(0));
        rewardRules[StakingLevel.LEGENDARY] = RewardRule(100, 100 days, address(0));
    }

    /**
    * @notice Starts a new staking.
    *
    * @param amount Amount of tokens to stake.
    * @param targetLevel Type of staking, see StakingLevel enum and rewardRules.
    */
    function stake(uint256 amount, StakingLevel targetLevel) external {
        require(amount >= MIN_STAKING_VALUE, "TaleStaking: Minimum staking amount 25000TALE");
        address staker = _msgSender();

        //check erc20 balance and allowance
        require(taleToken.balanceOf(staker) >= amount, "TaleStaking: Insufficient tokens");
        require(taleToken.allowance(staker, address(this)) >= amount, "TaleStaking: Not enough tokens allowed");

        uint stakingId = stakers[staker].stakingNumber + 1;    
        stakers[staker].stakingNumber = stakingId;
        stakers[staker].stakings[stakingId] = Staking(block.timestamp, amount, 0, targetLevel, StakingLevel.SIMPLE, false, true);
        stakers[staker].activeStakings[stakingId] = true;

        totalStaked += amount;
        taleToken.transferFrom(staker, address(this), amount);  

        emit Stake(staker, amount, targetLevel);
    }

    /**
    * @notice Pays rewards and withdraws the specified amount of tokens from staking. 
    *
    * @param stakingId Id of staking;
    */
    function claim(uint256 stakingId) external {
        address staker = _msgSender();
        Staking storage staking = stakers[staker].stakings[stakingId];        
        require(staking.isInitialized, "TaleStaking: Staking is not exists");
        require(!staking.isCompleted, "TaleStaking: Staking is completed");
        claimNft(staking, staker);
        claimTale(staking, stakingId, staker);
    }

    function claimTale(Staking storage staking, uint256 stakingId, address staker) private {
        RewardRule memory rewardRule = rewardRules[staking.targetLevel];
        if (block.timestamp >= staking.timestamp + rewardRule.period) {                    
            staking.isCompleted = true;       
            staking.rewarded = staking.amount * rewardRule.apr * rewardRule.period / 365 days / 100;
            delete stakers[staker].activeStakings[stakingId];
            
            totalStaked -= staking.amount;
            uint256 totalAmount = staking.amount + staking.rewarded;
            taleToken.transfer(staker, totalAmount);

            emit TaleReward(staker, staking.amount, staking.rewarded);
        }
    }

    function claimNft(Staking storage staking, address staker) private {
        uint256 stakingDuration = block.timestamp - staking.timestamp;
        for (uint256 i = uint256(staking.rewardedLevel)  + 1; i < 5; ++i) {
            StakingLevel level = StakingLevel(i);
            RewardRule memory rule = rewardRules[level];
            if (stakingDuration >= rule.period) {
                staking.rewardedLevel = level;
                require(rule.nftHero != address(0), "TaleStaking: Hero unset");
                minterFactory.mintTo(staker, rule.nftHero);
                emit NftReward(staker, rule.nftHero);
            } else {
                break;
            }       
        }
    }

    /**
    * @notice Returns the maximum available level for the user and staking
    *
    * @param user User address
    * @param stakingId Id of staking;
    */
    function getAvailableLevel(address user, uint256 stakingId) public view returns (StakingLevel) {
        Staking storage staking = stakers[user].stakings[stakingId];  
        StakingLevel availableLevel;        
        uint256 stakingDuration = block.timestamp - staking.timestamp;
        for (uint256 i = uint256(staking.rewardedLevel)  + 1; i < 5; ++i) {
            StakingLevel level = StakingLevel(i);
            RewardRule memory rule = rewardRules[level];
            if (rule.period >= stakingDuration) {
                availableLevel = level;
            } else {
                break;
            }       
        }

        return availableLevel;
    }

    /**
    * @notice Sets MinterFactory, only available to the owner
    *
    * @param factory Address of minter factory
    */
    function setMinterFactory(address factory) external onlyOwner {
        minterFactory = IMinterFactory(factory);
    }

    /**
    * @notice Sets hero address for different levels
    *
    * @param stakingLevel User address
    * @param nftAddress Hero NFT address
    */
    function setNft(StakingLevel stakingLevel, address nftAddress) external onlyOwner {
        rewardRules[stakingLevel].nftHero = nftAddress;
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
        taleToken.transfer(to, amount);
    }

    /**
    * @notice Returns the current number of tokens in the pool
    */
    function getPoolSize() public view returns(uint256) {
        uint256 balance = taleToken.balanceOf(address(this));
        return balance - totalStaked;
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
        for (uint256 i = 1; i <= stakers[user].stakingNumber; ++i) {
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
        for (uint256 i = 1; i <= stakers[user].stakingNumber; ++i) {
            if (stakers[user].activeStakings[i]) {
                ++count;
            }
        }
        return count;
    }
}