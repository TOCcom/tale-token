const { expectEvent, expectRevert, BN } = require("@openzeppelin/test-helpers");
const { soliditySha3 } = require("web3-utils");
const BuyPack = artifacts.require("BuyPack");
const TaleToken = artifacts.require("TaleToken");

contract("TaleRental", async accounts => {   
    before(async () => {
        this.buyPack = await BuyPack.deployed();
        this.taleToken = await TaleToken.new(accounts[1], toWei(1000),
            "0x0000000000000000000000000000000000000001", 0,
            "0x0000000000000000000000000000000000000002", 0,
            "0x0000000000000000000000000000000000000003", 0,
            "0x0000000000000000000000000000000000000004", 0);
    });

    it("should set tale token", async () => {     
        await this.buyPack.setTaleToken(this.taleToken.address);
        let taleAddress = await this.buyPack.getTaleToken();
        assert.equal(taleAddress, this.taleToken.address, "Invalid tale token address");
    });

    it("should not set tale token from not ower", async () => {     
        await expectRevert(this.buyPack.setTaleToken(this.taleToken.address, { from: accounts[1] }),
            "Ownable: caller is not the owner");
    });

    it("should set beneficary address", async () => {
        await this.buyPack.setBeneficiary(accounts[5]);
        let beneficaryAddress = await this.buyPack.getBeneficiary();
        assert.equal(beneficaryAddress, accounts[5], "Invalid beneficiary address");
    });

    it("should not set beneficary from not ower", async () => {     
        await expectRevert(this.buyPack.setBeneficiary(accounts[5], { from: accounts[1] }),
            "Ownable: caller is not the owner");
    });

    it("should set game server addres", async () => {
        await this.buyPack.setGameServer(accounts[6]);
        let gameServerAddress = await this.buyPack.getGameServer();
        assert.equal(gameServerAddress, accounts[6], "Invalid beneficiary address");
    });

    it("should not set game server from not ower", async () => {     
        await expectRevert(this.buyPack.setGameServer(accounts[6], { from: accounts[1] }),
            "Ownable: caller is not the owner");
    });

    it("should return message hash", async () => {       
        let messageHash = soliditySha3(256, toWei(50));
        let result = await this.buyPack.getMessageHash(256, toWei(50)); 
        assert.equal(result, messageHash, "Invalid message hash");
    });

    it("should throw not enough balance error", async () => {  
        let dealId = new BN(256);
        let price = toWei(50);   
        let messageHash = soliditySha3(dealId, price);
        let signature = await web3.eth.sign(messageHash, accounts[6])        
        await expectRevert(this.buyPack.buy(dealId, price, signature, {from: accounts[2]}),
            "TaleBuyPack: Buyer doesn't have enough token to buy this pack");
    });

    it("should throw not enough approved tokens error", async () => {  
        let dealId = new BN(256);
        let price = toWei(50);   
        let messageHash = soliditySha3(dealId, price);
        let signature = await web3.eth.sign(messageHash, accounts[6])    
        await this.taleToken.approve(this.buyPack.address,  toWei(10), {from: accounts[1]});    
        await expectRevert(this.buyPack.buy(dealId, price, signature, {from: accounts[1]}),
            "TaleBuyPack: Buyer doesn't approve TaleBuyPack to spend payment amount");
    });

    it("should throw invalid signature error", async () => {  
        let dealId = new BN(256);
        let price = toWei(50);   
        let messageHash = soliditySha3(dealId, price);
        let signature = await web3.eth.sign(messageHash, accounts[7])    
        await expectRevert(this.buyPack.buy(dealId, price, signature, {from: accounts[1]}),
            "TaleBuyPack: Invalid signature");
    });

    it("should transfer tokens and emit buy event", async () => {  
        let dealId = new BN(256);
        let price = toWei(50);   
        let messageHash = soliditySha3(dealId, price);
        let signature = await web3.eth.sign(messageHash, accounts[6])
        await this.taleToken.approve(this.buyPack.address, price, {from: accounts[1]});
        
        let buyResult = await this.buyPack.buy(dealId, price, signature, {from: accounts[1]});

        let buyerBalance = await this.taleToken.balanceOf(accounts[1]);
        let beneficiaryBalance = await this.taleToken.balanceOf(accounts[5]);
        expectEvent(buyResult, "PackBought", {
            buyer: accounts[1], dealId: dealId, amount: price
        });
        assert.ok(buyerBalance.eq(toWei(950)), "Invalid buyer balance after buy");
        assert.ok(beneficiaryBalance.eq(toWei(50)), "Invalid beneficiary balance after buy");
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