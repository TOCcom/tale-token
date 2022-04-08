// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimpleStaking is Ownable {

    uint256 public constant MIN_STAKING_VALUE = 1 * 10 ** 18;
    uint256 public constant CALCULATION_PERIOD = 300;
    uint256 private constant PERIODS_PER_YEAR = 365 days / CALCULATION_PERIOD;
    
    struct Staking {
        uint256 lastReward;
        uint256 amount;
        uint256 rewarded;
        bool isUnstaked;
        bool isInitialized;
    }

    mapping(address => Staking) public stakers;  
    uint256 public maxApy = 5000000; //500.0000%
    uint256 public totalStaked;
    IERC20 private taleToken;

    event Stake(address indexed staker, uint256 timestamp, uint256 addedAmount, uint totalStaked);
    event Reward(address indexed staker, uint256 timestamp, uint256 rewards);
    event UnStake(address indexed staker, uint256 timestamp, uint256 amount);
    
    constructor(address _taleToken) {
        taleToken = IERC20(_taleToken);
    }

    /**
    * @notice Starts a new staking or adds tokens to the active staking.
    *         If staking is active, withdraws the rewards and 
    *         adds the received tokens to active staking.  
    *
    * @param amount Amount of tokens to stake.
    */
    function stake(uint256 amount) external {
        require(amount >= MIN_STAKING_VALUE, "TaleStaking: Minimum staking amount 1TALE");
        address staker = _msgSender();

        //check erc20 balance and allowance
        require(taleToken.balanceOf(staker) >= amount, "TaleStaking: Insufficient tokens");
        require(taleToken.allowance(staker, address(this)) >= amount, "TaleStaking: Not enough tokens allowed");

        if (stakers[staker].isInitialized && !stakers[staker].isUnstaked) {
            _claim(staker);
            stakers[staker].amount += amount;
        } else {
            stakers[staker] = Staking(block.timestamp, amount, 0, false, true);
        }  
        
        totalStaked += amount;
        taleToken.transferFrom(staker, address(this), amount);  

        emit Stake(staker, block.timestamp, amount, stakers[staker].amount);
    }

    /**
    * @notice Pays rewards and withdraws the specified amount of tokens from staking. 
    *
    * @param amount Amount of tokens to stake.
    */
    function unstake(uint256 amount) external {
        address staker = _msgSender();
        Staking storage staking = stakers[staker];        
        require(amount <= staking.amount, "TaleStaking: Not enough tokens in staking");
        _claim(staker);

        if (staking.amount == amount) {
            staking.isUnstaked = true;
        }

        staking.amount -= amount;
        totalStaked -= amount;
        taleToken.transfer(staker, amount);

        emit UnStake(staker, block.timestamp, amount);
    }

    /**
    * @notice Pays rewards.
    */
    function claim() external {
        address staker = _msgSender();
        _claim(staker);
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
    * @notice Sets the maximum APY 
    *         Available only to the owner of the contract.
    */
    function setMaxApy(uint256 apy) external onlyOwner {
        maxApy = apy;
    }

    /**
    * @notice Returns the available amount of the reward for the specified address.
    *
    * @param staker Address of the staker for which the reward will be calculated
    */
    function getStakingReward(address staker) public view returns(uint256) {
        return _getStakingReward(stakers[staker]);
    }

    /**
    * @notice Returns current APY
    */
    function getCurrentApy() public view returns(uint256) {
        if (totalStaked == 0) {
            return maxApy;
        }
        uint256 apy = getPoolSize() * 1000000 / totalStaked;
        if (apy > maxApy) {
            return maxApy;
        } else {
            return apy;
        }
    }

    /**
    * @notice Returns the current number of tokens in the pool
    */
    function getPoolSize() public view returns(uint256) {
        uint256 balance = taleToken.balanceOf(address(this));
        return balance - totalStaked;
    }
    
    function _claim(address staker) private {        
        Staking storage staking = stakers[staker];
        uint256 reward = _getStakingReward(staking);
        staking.lastReward = block.timestamp;
        staking.rewarded += reward;
        taleToken.transfer(staker, reward);

        emit Reward(staker, block.timestamp, reward);
    }

    function _getStakingReward(Staking storage staking) private view returns(uint256) {
        require(staking.isInitialized, "TaleStaking: Staking is not exists");
        require(!staking.isUnstaked, "TaleStaking: Staking is unstaked");
        require(block.timestamp >= staking.lastReward, "TaleStaking: Invalid block timestamp");

        uint256 currentApy = getCurrentApy();        
        uint256 period = block.timestamp - staking.lastReward;
        uint256 periods = period / CALCULATION_PERIOD;
        return staking.amount * currentApy * periods / 1000000 / PERIODS_PER_YEAR;
    }
}