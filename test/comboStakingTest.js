const { time, expectEvent, expectRevert, BN } = require("@openzeppelin/test-helpers");
const TaleToken = artifacts.require("TaleToken");
const ComboStaking = artifacts.require("ComboStaking");
const MinterFactory = artifacts.require("MinterFactory");
const TalesOfChainHero = artifacts.require("TalesOfChainHero");
const TaleRental = artifacts.require("TaleRental");

contract("ComboStaking", async accounts => {
    before(async () => {        
        this.taleToken = await TaleToken.new(accounts[1], toWei(1000000),
            "0x0000000000000000000000000000000000000001", toWei(0),
            "0x0000000000000000000000000000000000000002", toWei(0),
            "0x0000000000000000000000000000000000000003", toWei(0),
            "0x0000000000000000000000000000000000000004", toWei(0));
        this.comboStaking = await ComboStaking.new(this.taleToken.address, MinterFactory.address);
        this.uncommonHero = await TalesOfChainHero.deployed();
        this.rareHero = await TalesOfChainHero.new("https://talesofchain.com/", MinterFactory.address, TaleRental.address);
        this.epicHero = await TalesOfChainHero.new("https://talesofchain.com/", MinterFactory.address, TaleRental.address);
        this.legendaryHero = await TalesOfChainHero.new("https://talesofchain.com/", MinterFactory.address, TaleRental.address);
        await MinterFactory.deployed().then(minter => minter.addMinter(this.comboStaking.address));
    });

    it("should set NFT heroes", async () => {  
        await this.comboStaking.setNft(1, this.uncommonHero.address);
        await this.comboStaking.setNft(2, this.rareHero.address);
        await this.comboStaking.setNft(3, this.epicHero.address);
        await this.comboStaking.setNft(4, this.legendaryHero.address);

        let simpleHeroAddress = (await this.comboStaking.rewardRules(0)).nftHero;
        let uncommonHeroAddress = (await this.comboStaking.rewardRules(1)).nftHero;
        let rareHeroAddress = (await this.comboStaking.rewardRules(2)).nftHero;
        let epicHeroAddress = (await this.comboStaking.rewardRules(3)).nftHero;
        let legendaryHeroAddress = (await this.comboStaking.rewardRules(4)).nftHero;

        assert.equal(simpleHeroAddress, "0x0000000000000000000000000000000000000000", "Invalid simple hero");       
        assert.equal(uncommonHeroAddress, this.uncommonHero.address, "Invalid uncommon hero");       
        assert.equal(rareHeroAddress, this.rareHero.address, "Invalid rare hero");  
        assert.equal(epicHeroAddress, this.epicHero.address, "Invalid epic hero");  
        assert.equal(legendaryHeroAddress, this.legendaryHero.address, "Invalid legendary hero");     
    });

    it("should return APR", async () => {  
        let simpleApr = (await this.comboStaking.rewardRules(0)).apr;
        let uncommonApr = (await this.comboStaking.rewardRules(1)).apr;
        let rareApr = (await this.comboStaking.rewardRules(2)).apr;
        let epicApr = (await this.comboStaking.rewardRules(3)).apr;
        let legendaryApr = (await this.comboStaking.rewardRules(4)).apr;

        assert.equal(simpleApr, 30, "Invalid simple apr");  
        assert.equal(uncommonApr, 50, "Invalid uncommon apr");       
        assert.equal(rareApr, 70, "Invalid rare apr");  
        assert.equal(epicApr, 90, "Invalid epic apr");  
        assert.equal(legendaryApr, 100, "Invalid legendary apr");     
    });

    it("should return pool size", async () => {  
        await this.taleToken.transfer(this.comboStaking.address, toWei(50000), {from: accounts[1]});
        let poolSize = await this.comboStaking.getPoolSize();
        assert.ok(poolSize.eq(toWei(50000)), "Invalid pool size");        
    });

    it("should withdraw", async () => {   
        let ownerBalanceBefore = await this.taleToken.balanceOf(accounts[0]);
        let poolSizeBefore = await this.comboStaking.getPoolSize();      
        await this.comboStaking.withdraw(accounts[0], toWei(30000));
        let ownerBalanceAfter = await this.taleToken.balanceOf(accounts[0]);  
        let poolSizeAfter = await this.comboStaking.getPoolSize();

        assert.ok(ownerBalanceBefore.add(toWei(30000)).eq(ownerBalanceAfter), "Invalid owner balance");
        assert.ok(poolSizeBefore.sub(toWei(30000)).eq(poolSizeAfter), "Invalid pool size");
    });

    it("should not stake low amount", async () => {   
        await expectRevert(this.comboStaking.stake(toWei(1000), 1), "TaleStaking: Minimum staking amount 25000TALE");
    });

    it("should stake for uncommon", async () => {   
        await this.taleToken.approve(this.comboStaking.address, toWei(25000), {from: accounts[1]});
        let result = await this.comboStaking.stake(toWei(25000), 1, {from: accounts[1]});
        expectEvent(result, "Stake", {
            staker: accounts[1], amount: toWei(25000), targetLevel: "1"
        });

        let timestamp = (await time.latest()).toNumber();
        let staking = await this.comboStaking.getStaking(accounts[1], 0);
        assert.ok(toWei(25000).eq(new BN(staking.amount)), "Invalid staking amount"); 
        assert.equal(staking.timestamp, timestamp, "Invalid timestamp");   
        assert.equal(staking.rewarded, 0, "Invalid rewarded amount");  
        assert.equal(staking.targetLevel, 1, "Invalid target level");  
        assert.equal(staking.rewardedLevel, 0, "Invalid rewarded level");  
        assert.equal(staking.isCompleted, false, "Invalid 'isCompleted' value"); 
        assert.equal(staking.isInitialized, true, "Invalid 'isInitialized' value"); 
    });

    it("should stake for rare", async () => {   
        await this.taleToken.approve(this.comboStaking.address, toWei(25000), {from: accounts[1]});
        let result = await this.comboStaking.stake(toWei(25000), 2, {from: accounts[1]});
        expectEvent(result, "Stake", {
            staker: accounts[1], amount: toWei(25000), targetLevel: "2"
        });

        let timestamp = (await time.latest()).toNumber();
        let staking = await this.comboStaking.getStaking(accounts[1], 1);
        assert.ok(toWei(25000).eq(new BN(staking.amount)), "Invalid staking amount"); 
        assert.equal(staking.timestamp, timestamp, "Invalid timestamp");   
        assert.equal(staking.rewarded, 0, "Invalid rewarded amount");  
        assert.equal(staking.targetLevel, 2, "Invalid target level");  
        assert.equal(staking.rewardedLevel, 0, "Invalid rewarded level");  
        assert.equal(staking.isCompleted, false, "Invalid 'isCompleted' value"); 
        assert.equal(staking.isInitialized, true, "Invalid 'isInitialized' value"); 
    });

    it("should stake for simple", async () => {   
        await this.taleToken.approve(this.comboStaking.address, toWei(25000), {from: accounts[1]});
        let result = await this.comboStaking.stake(toWei(25000), 0, {from: accounts[1]});
        expectEvent(result, "Stake", {
            staker: accounts[1], amount: toWei(25000), targetLevel: "0"
        });

        let timestamp = (await time.latest()).toNumber();
        let staking = await this.comboStaking.getStaking(accounts[1], 2);
        assert.ok(toWei(25000).eq(new BN(staking.amount)), "Invalid staking amount"); 
        assert.equal(staking.timestamp, timestamp, "Invalid timestamp");   
        assert.equal(staking.rewarded, 0, "Invalid rewarded amount");  
        assert.equal(staking.targetLevel, 0, "Invalid target level");  
        assert.equal(staking.rewardedLevel, 0, "Invalid rewarded level");  
        assert.equal(staking.isCompleted, false, "Invalid 'isCompleted' value"); 
        assert.equal(staking.isInitialized, true, "Invalid 'isInitialized' value"); 
    });

    it("should return total staked amount", async () => {
        let totalStaked = await this.comboStaking.totalStaked();
        assert.ok(totalStaked.eq(toWei(75000)), "Invalid total staked amount");  
    });

    it("should return all staking count", async () => {
        let stakingCount = await this.comboStaking.getAllStakingCount(accounts[1]);
        assert.equal(stakingCount, 3, "Invalid staking count");   
    });

    it("should return active staking count", async () => {
        let stakingCount = await this.comboStaking.getActiveStakingCount(accounts[1]);
        assert.equal(stakingCount, 3, "Invalid active staking count");   
    });

    it("should return active staking indexes", async () => {
        let stakingIndexes = await this.comboStaking.getActiveStakingIndexes(accounts[1]);

        assert.equal(stakingIndexes.length, 3, "Invalid active staking count");  
        assert.equal(stakingIndexes[0], 0, "Invalid staking index");   
        assert.equal(stakingIndexes[1], 1, "Invalid staking index");  
        assert.equal(stakingIndexes[2], 2, "Invalid staking index");  
    });

    it("should not cliam ahead of time", async () => {
        let result = await this.comboStaking.claim(1, {from: accounts[1]});
        assert.equal(result.receipt.logs.length, 0, "Invalid logs count");
    });

    it("should cliam only nft", async () => {
        await time.increase(time.duration.days(30));
        let result = await this.comboStaking.claim(1, {from: accounts[1]});
        assert.equal(result.receipt.logs.length, 1, "Invalid logs count");
        expectEvent(result, "NftReward", {
            staker: accounts[1], taleHero: this.uncommonHero.address
        });
        let stakerNftBalance = await this.uncommonHero.balanceOf(accounts[1]);
        assert.equal(stakerNftBalance, 1, "Invalid staker NFT balance");
    });

    it("should cliam only tale and complete staking", async () => {
        let stakerBalanceBefore = await this.taleToken.balanceOf(accounts[1]);
        let expectedRewards = new BN("308219178082191780821");
        let result = await this.comboStaking.claim(2, {from: accounts[1]});
        assert.equal(result.receipt.logs.length, 1, "Invalid logs count");
        expectEvent(result, "TaleReward", {
            staker: accounts[1], amount: toWei(25000), reward: expectedRewards
        });
        let stakerNftBalance = await this.uncommonHero.balanceOf(accounts[1]);
        assert.equal(stakerNftBalance, 1, "Invalid staker NFT balance");

        let staking = await this.comboStaking.getStaking(accounts[1], 2);
        assert.ok(toWei(25000).eq(new BN(staking.amount)), "Invalid staking amount"); 
        assert.equal(staking.rewarded, expectedRewards, "Invalid rewarded amount");  
        assert.equal(staking.targetLevel, 0, "Invalid target level");  
        assert.equal(staking.rewardedLevel, 0, "Invalid rewarded level");  
        assert.equal(staking.isCompleted, true, "Invalid 'isCompleted' value"); 
        assert.equal(staking.isInitialized, true, "Invalid 'isInitialized' value"); 

        let stakerBalanceAfter = await this.taleToken.balanceOf(accounts[1]); 
        assert.ok(stakerBalanceAfter.sub(stakerBalanceBefore)
                  .eq(expectedRewards.add(toWei(25000))), 'Invalid staker balance after');
    });

    it("should compele staking", async () => {
        await time.increase(time.duration.days(30));
        let result = await this.comboStaking.claim(1, {from: accounts[1]});
        assert.equal(result.receipt.logs.length, 2, "Invalid logs count");
        expectEvent(result, "NftReward", {
            staker: accounts[1], taleHero: this.rareHero.address
        });
        expectEvent(result, "TaleReward", {
            staker: accounts[1], amount: toWei(25000), reward: "2397260273972602739726"
        });
        let stakerRareBalance = await this.rareHero.balanceOf(accounts[1]);
        assert.equal(stakerRareBalance, 1, "Invalid staker Rare Hero balance");

        let staking = await this.comboStaking.getStaking(accounts[1], 1);
        assert.ok(toWei(25000).eq(new BN(staking.amount)), "Invalid staking amount"); 
        assert.equal(staking.rewarded, "2397260273972602739726", "Invalid rewarded amount");  
        assert.equal(staking.targetLevel, 2, "Invalid target level");  
        assert.equal(staking.rewardedLevel, 2, "Invalid rewarded level");  
        assert.equal(staking.isCompleted, true, "Invalid 'isCompleted' value"); 
        assert.equal(staking.isInitialized, true, "Invalid 'isInitialized' value"); 
    });

    it("should return all staking count", async () => {
        let stakingCount = await this.comboStaking.getAllStakingCount(accounts[1]);
        assert.equal(stakingCount, 3, "Invalid staking count");   
    });

    it("should return active staking count", async () => {
        let stakingCount = await this.comboStaking.getActiveStakingCount(accounts[1]);
        assert.equal(stakingCount, 1, "Invalid active staking count");   
    });

    it("should return active staking indexes", async () => {
        let stakingIndexes = await this.comboStaking.getActiveStakingIndexes(accounts[1]);

        assert.equal(stakingIndexes.length, 1, "Invalid active staking count");  
        assert.equal(stakingIndexes[0], 0, "Invalid staking index");   
    });

    it("should return total staked amount", async () => {
        let totalStaked = await this.comboStaking.totalStaked();
        assert.ok(totalStaked.eq(toWei(25000)), "Invalid total staked amount");  
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