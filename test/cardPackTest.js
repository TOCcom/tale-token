const { expectEvent, expectRevert, BN } = require("@openzeppelin/test-helpers");
const { soliditySha3 } = require("web3-utils");
const CardPack = artifacts.require("CardPack");
const TaleToken = artifacts.require("TaleToken");
const TalesOfChainHero = artifacts.require("TalesOfChainHero");

contract("CardPack", async accounts => {   
    before(async () => {
        this.cardPack = await CardPack.deployed();
        this.taleToken = await TaleToken.new(accounts[1], toWei(1000),
            "0x0000000000000000000000000000000000000001", 0,
            "0x0000000000000000000000000000000000000002", 0,
            "0x0000000000000000000000000000000000000003", 0,
            "0x0000000000000000000000000000000000000004", 0);
        this.gameServer = accounts[6];
        this.talesOfChainHero = await TalesOfChainHero.deployed();
    });

    it("should set tale token", async () => {     
        await this.cardPack.setTaleToken(this.taleToken.address);
        let taleAddress = await this.cardPack.getTaleToken();
        assert.equal(taleAddress, this.taleToken.address, "Invalid tale token address");
    });

    it("should not set tale token from not ower", async () => {     
        await expectRevert(this.cardPack.setTaleToken(this.taleToken.address, { from: accounts[1] }),
            "Ownable: caller is not the owner");
    });

    it("should set beneficary address", async () => {
        await this.cardPack.setBeneficiary(accounts[5]);
        let beneficaryAddress = await this.cardPack.getBeneficiary();
        assert.equal(beneficaryAddress, accounts[5], "Invalid beneficiary address");
    });

    it("should not set beneficary from not ower", async () => {     
        await expectRevert(this.cardPack.setBeneficiary(accounts[5], { from: accounts[1] }),
            "Ownable: caller is not the owner");
    });

    it("should set game server addres", async () => {
        await this.cardPack.setGameServer(this.gameServer);
        let gameServerAddress = await this.cardPack.getGameServer();
        assert.equal(gameServerAddress, this.gameServer, "Invalid beneficiary address");
    });

    it("should not set game server from not ower", async () => {     
        await expectRevert(this.cardPack.setGameServer(this.gameServer, { from: accounts[1] }),
            "Ownable: caller is not the owner");
    });

    it("should return buy message hash", async () => {       
        let messageHash = soliditySha3(256, toWei(50));
        let result = await this.cardPack.getBuyMessageHash(256, toWei(50)); 
        assert.equal(result, messageHash, "Invalid message hash");
    });

    it("should throw not enough balance error", async () => {  
        let dealId = new BN(256);
        let price = toWei(50);   
        let messageHash = soliditySha3(dealId, price);
        let signature = await web3.eth.sign(messageHash, this.gameServer)        
        await expectRevert(this.cardPack.buy(dealId, price, signature, {from: accounts[2]}),
            "CardPack: Buyer doesn't have enough token to buy this pack");
    });

    it("should throw not enough approved tokens error", async () => {  
        let dealId = new BN(256);
        let price = toWei(50);   
        let messageHash = soliditySha3(dealId, price);
        let signature = await web3.eth.sign(messageHash, this.gameServer)    
        await this.taleToken.approve(this.cardPack.address,  toWei(10), {from: accounts[1]});    
        await expectRevert(this.cardPack.buy(dealId, price, signature, {from: accounts[1]}),
            "CardPack: Buyer doesn't approve CardPack to spend payment amount");
    });

    it("should throw invalid signature error", async () => {  
        let dealId = new BN(256);
        let price = toWei(50);   
        let messageHash = soliditySha3(dealId, price);
        let signature = await web3.eth.sign(messageHash, accounts[7])    
        await expectRevert(this.cardPack.buy(dealId, price, signature, {from: accounts[1]}),
            "CardPack: Invalid signature");
    });

    it("should transfer tokens and emit buy event", async () => {  
        let dealId = new BN(256);
        let price = toWei(50);   
        let messageHash = soliditySha3(dealId, price);
        let signature = await web3.eth.sign(messageHash, this.gameServer)
        await this.taleToken.approve(this.cardPack.address, price, {from: accounts[1]});
        
        let buyResult = await this.cardPack.buy(dealId, price, signature, {from: accounts[1]});

        let buyerBalance = await this.taleToken.balanceOf(accounts[1]);
        let beneficiaryBalance = await this.taleToken.balanceOf(accounts[5]);
        expectEvent(buyResult, "PackBought", {
            buyer: accounts[1], dealId: dealId, amount: price, signature: signature
        });
        assert.ok(buyerBalance.eq(toWei(950)), "Invalid buyer balance after buy");
        assert.ok(beneficiaryBalance.eq(toWei(50)), "Invalid beneficiary balance after buy");
    });

    it("should throw invalid signature at open", async () => {  
        let dealId = new BN(256);
        let heroContracts = [ this.talesOfChainHero.address ];
        let heroQuantities = [ 3 ]; 
        let messageHash = soliditySha3(dealId, 
            { t: 'address', v: heroContracts}, 
            { t: 'uint256', v: heroQuantities});
        let signature = await web3.eth.sign(messageHash, accounts[1]);
        
        await expectRevert(this.cardPack.open(dealId, heroContracts, heroQuantities,
            signature, {from: accounts[1]}), "CardPack: Invalid signature");
    });

    it("should mint tokens", async () => {  
        let dealId = new BN(256);
        let heroContracts = [ this.talesOfChainHero.address ];
        let heroQuantities = [ 3 ]; 
        let messageHash = soliditySha3(dealId, 
            { t: 'address', v: heroContracts}, 
            { t: 'uint256', v: heroQuantities});
        let signature = await web3.eth.sign(messageHash, this.gameServer);
        
        let openResult = await this.cardPack.open(dealId, heroContracts, heroQuantities,
             signature, {from: accounts[1]});

        expectEvent(openResult, "PackOpened", {
            opener: accounts[1], dealId: dealId, signature: signature
        });

        let nftBalance = await this.talesOfChainHero.balanceOf(accounts[1]);
        assert.equal(nftBalance, 3, "Invalid opener balance after open");
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