const { time, expectEvent, expectRevert, BN } = require("@openzeppelin/test-helpers");
const TaleToken = artifacts.require("TaleToken");
const HeroStaking = artifacts.require("HeroStaking");
const TalesOfChainHero = artifacts.require("TalesOfChainHero");
const MinterFactory = artifacts.require("MinterFactory");

contract("HeroStaking", async accounts => {
    before(async () => {        
        this.taleToken = await TaleToken.new(accounts[1], toWei(1000000),
            "0x0000000000000000000000000000000000000001", toWei(0),
            "0x0000000000000000000000000000000000000002", toWei(0),
            "0x0000000000000000000000000000000000000003", toWei(0),
            "0x0000000000000000000000000000000000000004", toWei(0));
        this.heroStaking = await HeroStaking.new(this.taleToken.address,
            "1000000000000000");
        this.taleHero = await TalesOfChainHero.deployed();
        this.minterFactory = await MinterFactory.deployed();
        await this.minterFactory.addMinter(accounts[0]);
    });

    it("should set tale per nft and period", async () => {
        let talePerNftAndPeriod = await this.heroStaking.talePerNftAndPeriod();
        assert.equal(talePerNftAndPeriod, 1000000000000000, "Invalid tale per nft value");  
        
        await this.heroStaking.setTalePerNftAndPeriod("2000000000000000");
        talePerNftAndPeriod = await this.heroStaking.talePerNftAndPeriod();
        assert.equal(talePerNftAndPeriod, 2000000000000000, "Invalid tale per nft value");  
    });

    it("should allow NFT heroes", async () => {  
        await this.heroStaking.setHeroAllowance(this.taleHero.address, true);
        let isHeroAllowed = await this.heroStaking.allowedHeroes(this.taleHero.address);
        assert.equal(isHeroAllowed, true, "Hero not allowed");   
    });

    it("should return pool size", async () => {  
        await this.taleToken.transfer(this.heroStaking.address, toWei(50000), {from: accounts[1]});
        let poolSize = await this.heroStaking.getPoolSize();
        assert.ok(poolSize.eq(toWei(50000)), "Invalid pool size");        
    });

    it("should withdraw", async () => {   
        let ownerBalanceBefore = await this.taleToken.balanceOf(accounts[0]);
        let poolSizeBefore = await this.heroStaking.getPoolSize();      
        await this.heroStaking.withdraw(accounts[0], toWei(30000));
        let ownerBalanceAfter = await this.taleToken.balanceOf(accounts[0]);  
        let poolSizeAfter = await this.heroStaking.getPoolSize();

        assert.ok(ownerBalanceBefore.add(toWei(30000)).eq(ownerBalanceAfter), "Invalid owner balance");
        assert.ok(poolSizeBefore.sub(toWei(30000)).eq(poolSizeAfter), "Invalid pool size");
    });

    it("should not stake invalid hero", async () => {   
        await expectRevert(this.heroStaking.stake("0x0000000000000000000000000000000000000005", 1), "TaleStaking: Can't stake this hero in this pool");
    });

    it("should not stake not exists hero", async () => {   
        await expectRevert(this.heroStaking.stake(this.taleHero.address, 1), "ERC721: owner query for nonexistent token.");
    });

    it("should stake hero", async () => {   
        await this.minterFactory.mintTo(accounts[1], this.taleHero.address);
        await this.taleHero.approve(this.heroStaking.address, 0, {from: accounts[1]});

        let result = await this.heroStaking.stake(this.taleHero.address, 0, {from: accounts[1]});
        expectEvent(result, "Stake", {
            staker: accounts[1], hero: this.taleHero.address, tokenId: new BN(0)
        });

        let timestamp = (await time.latest()).toNumber();
        let staking = await this.heroStaking.getStaking(accounts[1], 0);
        assert.equal(staking.timestamp, timestamp, "Invalid timestamp");   
        assert.equal(staking.lastReward, timestamp, "Invalid 'lastReward' value");   
        assert.equal(staking.rewarded, 0, "Invalid rewarded amount");  
        assert.equal(staking.hero, this.taleHero.address, "Invalid staking hero");  
        assert.equal(staking.tokenId, 0, "Invalid staked token id");  
        assert.equal(staking.isCompleted, false, "Invalid 'isCompleted' value"); 
        assert.equal(staking.isInitialized, true, "Invalid 'isInitialized' value"); 
    });

    it("should stake twice", async () => {        
        await this.minterFactory.mintTo(accounts[1], this.taleHero.address);
        await this.taleHero.approve(this.heroStaking.address, 1, {from: accounts[1]});

        let result = await this.heroStaking.stake(this.taleHero.address, 1, {from: accounts[1]});
        expectEvent(result, "Stake", {
            staker: accounts[1], hero: this.taleHero.address, tokenId: new BN(1)
        });

        let timestamp = (await time.latest()).toNumber();
        let staking = await this.heroStaking.getStaking(accounts[1], 1);
        assert.equal(staking.timestamp, timestamp, "Invalid timestamp");   
        assert.equal(staking.lastReward, timestamp, "Invalid 'lastReward' value");   
        assert.equal(staking.rewarded, 0, "Invalid rewarded amount");  
        assert.equal(staking.hero, this.taleHero.address, "Invalid staking hero");  
        assert.equal(staking.tokenId, 1, "Invalid staked token id");  
        assert.equal(staking.isCompleted, false, "Invalid 'isCompleted' value"); 
        assert.equal(staking.isInitialized, true, "Invalid 'isInitialized' value"); 
    });

    it("should return total staked heroes", async () => {
        let totalStaked = await this.heroStaking.totalStaked();
        assert.equal(totalStaked, 2, "Invalid total staked heroes");  
    });

    it("should return all staking count", async () => {
        let stakingCount = await this.heroStaking.getAllStakingCount(accounts[1]);
        assert.equal(stakingCount, 2, "Invalid staking count");   
    });

    it("should return active staking count", async () => {
        let stakingCount = await this.heroStaking.getActiveStakingCount(accounts[1]);
        assert.equal(stakingCount, 2, "Invalid active staking count");   
    });

    it("should return active staking indexes", async () => {
        let stakingIndexes = await this.heroStaking.getActiveStakingIndexes(accounts[1]);

        assert.equal(stakingIndexes.length, 2, "Invalid active staking count");  
        assert.equal(stakingIndexes[0], 0, "Invalid staking index");   
        assert.equal(stakingIndexes[1], 1, "Invalid staking index");  
    });

    it("should claim", async () => {
        let stakerBalanceBefore = await this.taleToken.balanceOf(accounts[1]);
        let poolSizeBefore = await this.heroStaking.getPoolSize();
        let expectedRewards = toWei(17.28);
        
        await time.increase(time.duration.days(30));      
        let result = await this.heroStaking.claim(0, {from: accounts[1]});
        assert.equal(result.receipt.logs.length, 1, "Invalid logs count");
        expectEvent(result, "Reward", {
            staker: accounts[1], rewards: expectedRewards
        });

        let stakerBalanceAfter = await this.taleToken.balanceOf(accounts[1]);
        let poolSizeAfter = await this.heroStaking.getPoolSize();
        assert.ok(stakerBalanceAfter.sub(stakerBalanceBefore).eq(expectedRewards), "Invalid staker balance after claim");
        assert.ok(poolSizeBefore.sub(poolSizeAfter).eq(expectedRewards), "Invalid pool size after claim");
    });

    it("should unstake", async () => {
        let stakerBalanceBefore = await this.taleToken.balanceOf(accounts[1]);
        let poolSizeBefore = await this.heroStaking.getPoolSize();
        let expectedRewards = toWei(17.28);

        await time.increase(time.duration.days(30));
        let result = await this.heroStaking.unstake(0, {from: accounts[1]});
        assert.equal(result.receipt.logs.length, 2, "Invalid logs count");
        expectEvent(result, "Reward", {
            staker: accounts[1], rewards: expectedRewards
        });
        expectEvent(result, "Unstake", {
            staker: accounts[1], hero: this.taleHero.address, tokenId: new BN(0)
        });

        let stakerBalanceAfter = await this.taleToken.balanceOf(accounts[1]);
        let poolSizeAfter = await this.heroStaking.getPoolSize();

        assert.ok(stakerBalanceAfter.sub(stakerBalanceBefore).eq(expectedRewards), "Invalid staker balance after claim");
        assert.ok(poolSizeBefore.sub(poolSizeAfter).eq(expectedRewards), "Invalid pool size after claim");

        let timestamp = (await time.latest()).toNumber();
        let staking = await this.heroStaking.getStaking(accounts[1], 0);
        assert.equal(staking.lastReward, timestamp, "Invalid 'lastReward' value");   
        assert.equal(staking.rewarded, toWei(34.56), "Invalid rewarded amount");  
        assert.equal(staking.hero, this.taleHero.address, "Invalid staking hero");  
        assert.equal(staking.tokenId, 0, "Invalid staked token id");  
        assert.equal(staking.isCompleted, true, "Invalid 'isCompleted' value"); 
        assert.equal(staking.isInitialized, true, "Invalid 'isInitialized' value"); 

        let heroOwner = await this.taleHero.ownerOf(0);
        assert.equal(heroOwner, accounts[1], "Invalid hero owner");  
    });

    it("should return all staking count", async () => {
        let stakingCount = await this.heroStaking.getAllStakingCount(accounts[1]);
        assert.equal(stakingCount, 2, "Invalid staking count");   
    });

    it("should return active staking count", async () => {
        let stakingCount = await this.heroStaking.getActiveStakingCount(accounts[1]);
        assert.equal(stakingCount, 1, "Invalid active staking count");   
    });

    it("should return active staking indexes", async () => {
        let stakingIndexes = await this.heroStaking.getActiveStakingIndexes(accounts[1]);

        assert.equal(stakingIndexes.length, 1, "Invalid active staking count");  
        assert.equal(stakingIndexes[0], 1, "Invalid staking index");   
    });

    it("should return total staked heroes", async () => {
        let totalStaked = await this.heroStaking.totalStaked();
        assert.equal(totalStaked, 1, "Invalid total staked heroes");  
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