const { time, expectEvent, expectRevert, BN } = require("@openzeppelin/test-helpers");
const TaleToken = artifacts.require("TaleToken");
const SimpleStaking = artifacts.require("SimpleStaking");

contract("SimpleStaking", async accounts => {
    before(async () => {        
        this.taleToken = await TaleToken.new(accounts[1], toWei(1000000),
            "0x0000000000000000000000000000000000000001", toWei(0),
            "0x0000000000000000000000000000000000000002", toWei(0),
            "0x0000000000000000000000000000000000000003", toWei(0),
            "0x0000000000000000000000000000000000000004", toWei(0));
        this.simpleStaking = await SimpleStaking.new(this.taleToken.address);
    });

    it("should return pool size", async () => {  
        await this.taleToken.transfer(this.simpleStaking.address, toWei(50000), {from: accounts[1]});
        let poolSize = await this.simpleStaking.getPoolSize();
        assert.ok(poolSize.eq(toWei(50000)), "Invalid pool size");        
    });

    it("should return max APR", async () => {  
        let apr = await this.simpleStaking.getCurrentApr();
        assert.equal(apr, 5000000, "Invalid APR");        
    });

    it("should set max APR", async () => {  
        await this.simpleStaking.setMaxApr(1500000);
        let apr = await this.simpleStaking.getCurrentApr();
        assert.equal(apr, 1500000, "Invalid APR");        
    });

    it("should not stake not allowed tokens", async () => {  
        await expectRevert(this.simpleStaking.stake(toWei(1500), {from: accounts[1]}), 
                            "TaleStaking: Not enough tokens allowed");
    });

    it("should not stake not when not enough tokens", async () => {  
        await expectRevert(this.simpleStaking.stake(toWei(1500)), "TaleStaking: Insufficient tokens");
    });

    it("should stake tokens", async () => {         
        await this.taleToken.approve(this.simpleStaking.address, toWei(1500), {from: accounts[1]});
        let stakingResult = await this.simpleStaking.stake(toWei(1500), {from: accounts[1]});

        expectEvent(stakingResult, "Stake", {
            staker: accounts[1], addedAmount: toWei(1500), totalStaked: toWei(1500)
        });

        let timestamp = (await time.latest()).toNumber();
        let staker = await this.simpleStaking.stakers(accounts[1]);
        assert.equal(staker.lastReward, timestamp, "Last reward not equal to block timestamp");        
        assert.equal(staker.rewarded, 0, "Staking rewarded value is not equal to 0");
        assert.equal(staker.isUnstaked, false, "Staking flag 'isUnstaked' must be false");
        assert.equal(staker.isInitialized, true, "Staking not initialized");
        assert.ok(staker.amount.eq(toWei(1500)), "Staking amount is not equal to 1500");

        let stakingBalance = await this.taleToken.balanceOf(this.simpleStaking.address);
        let userBalance = await this.taleToken.balanceOf(accounts[1]);
        assert.ok(stakingBalance.eq(toWei(51500)), "Staking contract balance invalid");        
        assert.ok(userBalance.eq(toWei(948500)), "User balance invalid");
    });

    it ("should return current APR", async () => {
        let apr = await this.simpleStaking.getCurrentApr();
        assert.equal(apr, 1500000, "Invalid APR");  //apr should be 33333.3333% but max APR 15.0000%   
    });

    it("should add tokens to stake", async () => {
        await this.taleToken.approve(this.simpleStaking.address, toWei(30000), {from: accounts[1]});
        await time.increase(time.duration.hours(1));
        let stakingResult = await this.simpleStaking.stake(toWei(30000), {from: accounts[1]});
        expectEvent(stakingResult, "Stake", {
            staker: accounts[1], addedAmount: toWei(30000), totalStaked: toWei(31500)
        });

        let timestamp = (await time.latest()).toNumber();
        let staker = await this.simpleStaking.stakers(accounts[1]);      
        let availableRewards = await this.simpleStaking.getStakingReward(accounts[1]);    
        assert.equal(staker.lastReward, timestamp, "Last reward not equal to block timestamp");       
        assert.equal(staker.isUnstaked, false, "Staking flag 'isUnstaked' must be false");
        assert.equal(staker.isInitialized, true, "Staking not initialized");
        assert.equal(availableRewards, "256849315068493150", "Invalid available rewards value");
        assert.equal(staker.rewarded, 0, "Staking rewarded value is not zero");
        assert.ok(staker.amount.eq(toWei(31500)), "Staking amount is not equal to 31500");

        let stakingBalance = await this.simpleStaking.totalStaked();
        let userBalance = await this.taleToken.balanceOf(accounts[1]);
        assert.ok(stakingBalance.eq(toWei(31500)), "Imvalid total staked amount");  
        assert.ok(userBalance.eq(toWei(918500)), "User balance invalid");
    });

    it("should withdrawal and change apr", async () => {   
        let ownerBalanceBefore = await this.taleToken.balanceOf(accounts[0]);
        let poolSizeBefore = await this.simpleStaking.getPoolSize();      
        await this.simpleStaking.withdraw(accounts[0], toWei(30000));
        let ownerBalanceAfter = await this.taleToken.balanceOf(accounts[0]);  
        let poolSizeAfter = await this.simpleStaking.getPoolSize();
        let currentApr = await this.simpleStaking.getCurrentApr();

        assert.ok(ownerBalanceBefore.add(toWei(30000)).eq(ownerBalanceAfter), "Invalid owner balance");
        assert.ok(poolSizeBefore.sub(toWei(30000)).eq(poolSizeAfter), "Invalid pool size");
        assert.equal(currentApr, 634920, "Invalid APR");
    });

    it("should claim", async () => {   
        let balanceBefore = await this.taleToken.balanceOf(accounts[1]);
        await time.increase(time.duration.hours(1));   
        let claimResult = await this.simpleStaking.claim({from: accounts[1]});
        let balanceAfter = await this.taleToken.balanceOf(accounts[1]); 
        let balanceDelta =  balanceAfter.sub(balanceBefore);
        let expectedReward = new BN("2539952054794520547");
        expectEvent(claimResult, "Reward", {
            staker: accounts[1], rewards: expectedReward
        });

        assert.ok(balanceDelta.eq(expectedReward), "Invalid reward amount");
    });

    it("should partially unstake", async () => {           
        let balanceBefore = await this.taleToken.balanceOf(accounts[1]);
        let poolSizeBefore = await this.simpleStaking.getPoolSize();
        let rewardedBefore = (await this.simpleStaking.stakers(accounts[1])).rewarded;
        time.increase(time.duration.hours(1));
        let unstakeResult = await this.simpleStaking.unstake(toWei(11500), {from: accounts[1]});
        let expectedReward = new BN("2282815068493150684");

        expectEvent(unstakeResult, "Reward", {
            staker: accounts[1], rewards: expectedReward
        });
        expectEvent(unstakeResult, "UnStake", {
            staker: accounts[1], amount: toWei(11500)
        });

        let balanceAfter = await this.taleToken.balanceOf(accounts[1]);         
        let poolSizeAfter = await this.simpleStaking.getPoolSize();
        let staker = await this.simpleStaking.stakers(accounts[1]);
        let balanceDelta = balanceAfter.sub(balanceBefore);
        let poolSizeDelta = poolSizeBefore.sub(poolSizeAfter);

        assert.ok(poolSizeDelta.eq(expectedReward), "Invalid pool size");
        assert.ok(balanceDelta.eq(toWei(11500).add(expectedReward)), "Invalid user balance");
        assert.ok(staker.amount.eq(toWei(20000)), "Invalid staker amount");
        assert.ok(staker.rewarded.eq(rewardedBefore.add(expectedReward)), "Invalid staker rewarded amount");
        assert.equal(staker.isUnstaked, false, "Staker property 'isUnstaked' should be false");
        assert.equal(staker.isInitialized, true, "Staker property 'isInitialized' should be false");
    });

    it("should unstake", async () => {           
        let balanceBefore = await this.taleToken.balanceOf(accounts[1]);
        let poolSizeBefore = await this.simpleStaking.getPoolSize();
        let rewardedBefore = (await this.simpleStaking.stakers(accounts[1])).rewarded;
        await time.increase(time.duration.hours(1));    
        let claimResult = await this.simpleStaking.unstake(toWei(20000), {from: accounts[1]});
        let expectedReward = new BN("2282552511415525114");
        expectEvent(claimResult, "Reward", {
            staker: accounts[1], rewards: expectedReward
        });
        expectEvent(claimResult, "UnStake", {
            staker: accounts[1], amount: toWei(20000)
        });

        let balanceAfter = await this.taleToken.balanceOf(accounts[1]);         
        let poolSizeAfter = await this.simpleStaking.getPoolSize();
        let staker = await this.simpleStaking.stakers(accounts[1]);
        let balanceDelta = balanceAfter.sub(balanceBefore);
        let poolSizeDelta = poolSizeBefore.sub(poolSizeAfter);

        assert.ok(poolSizeDelta.eq(expectedReward), "Invalid pool size");
        assert.ok(balanceDelta.eq(toWei(20000).add(expectedReward)), "Invalid user balance");        
        assert.ok(staker.rewarded.eq(rewardedBefore.add(expectedReward)), "Invalid staker rewarder amount");
        assert.equal(staker.amount, 0, "Invalid staker amount");
        assert.equal(staker.isUnstaked, true, "Staker property 'isUnstaked' should be false");
        assert.equal(staker.isInitialized, true, "Staker property 'isInitialized' should be false");
    });
 });

function toWei(number) {
    let decimals = 18;
    let shifted;
    var str = number.toString();
    if (str.indexOf(".") !== -1) {
        decimals -= str.split(".")[1].length || 0;
        shifted = parseInt(str.replace('.',''));
    } else {
        shifted = number;
    }
    return new BN(10).pow(new BN(decimals)).mul(new BN(shifted));
}