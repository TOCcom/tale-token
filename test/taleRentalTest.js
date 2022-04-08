const { expectEvent, expectRevert, BN } = require("@openzeppelin/test-helpers");
const { soliditySha3 } = require("web3-utils");
const TaleRental = artifacts.require("TaleRental");
const TalesOfChainHero = artifacts.require("TalesOfChainHero");
const MinterFactory = artifacts.require("MinterFactory");
const TaleToken = artifacts.require("TaleToken");

contract("TaleRental", async accounts => {   
    before(async () => {
        this.taleRental = await TaleRental.deployed();
    });

    it("should return message hash", async () => {       
        let messageHash = soliditySha3(
            "0xd9145CCE52D386f254917e481eB44e9943F39138",
            1, 
            10000, 
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", 
            86400, 
            654243504);
        let result = await this.taleRental.getMessageHash(
            "0xd9145CCE52D386f254917e481eB44e9943F39138",
            1,
            10000,
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
            86400,
            654243504); 
        assert.equal(result, messageHash, "Invalid message hash");
    });

    it("should cancel signature", async () => {
        let messageHash = soliditySha3(
            "0xd9145CCE52D386f254917e481eB44e9943F39138",
            1, 
            10000, 
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", 
            86400, 
            654243504);
        let signature = await web3.eth.sign(messageHash, accounts[0]);
        let result = await this.taleRental.cancelSignature(
            [1, 10000, 86400, 654243504],
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
            "0xd9145CCE52D386f254917e481eB44e9943F39138",
            signature);
        expectEvent(result, "CancelSignature",  {
                tokenContract: "0xd9145CCE52D386f254917e481eB44e9943F39138",
                tokenId: new BN(1), 
                signature: signature
            }, "Contract should emit correct CancelSignature event");
    });

    it("should not cancel signature twice", async () => {
        let messageHash = soliditySha3(
            "0xd9145CCE52D386f254917e481eB44e9943F39138",
            2, 
            10000, 
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", 
            86400, 
            654243504);
        let signature = await web3.eth.sign(messageHash, accounts[0]);
        await this.taleRental.cancelSignature([2, 10000, 86400, 654243504],
                "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
                "0xd9145CCE52D386f254917e481eB44e9943F39138",
                signature);
        await expectRevert(this.taleRental.cancelSignature(
                [2, 10000, 86400, 654243504],
                "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
                "0xd9145CCE52D386f254917e481eB44e9943F39138",
                signature), "TaleRental: This signature is used");
    });

    it("should set rental fee", async () => {
        await this.taleRental.setRentalFee(250);
        let rentalFee = await this.taleRental.rentalFee();
        assert.equal(rentalFee, 250, "Rental fee differs from the specified");
    });

    it("should set rental fee address", async () => {
        await this.taleRental.setFeeToAddress("0x17F6AD8Ef982297579C203069C1DbfFE4348c372");
        let rentalAddress = await this.taleRental.feeToAddress();
        assert.equal(rentalAddress, "0x17F6AD8Ef982297579C203069C1DbfFE4348c372", "Rental fee address differs from the specified");
    });

    it("should mint and rent hero", async () => {
        const heroPrice = 10000;
        const fee = 0.025; //2.5%

        const minter = await MinterFactory.deployed();
        const taleHero = await TalesOfChainHero.deployed();
        const taleToken = await TaleToken.new(accounts[1], 1000000,
            "0x0000000000000000000000000000000000000001", 0,
            "0x0000000000000000000000000000000000000002", 0,
            "0x0000000000000000000000000000000000000003", 0,
            "0x0000000000000000000000000000000000000004", 0);

        await taleHero.setMintFactory(minter.address);
        await minter.addMinter(accounts[0]);
        await minter.mintTo(accounts[0], taleHero.address);
        await taleToken.approve(this.taleRental.address, 10000, {from: accounts[1]});
        await this.taleRental.setFeeToAddress(accounts[2]);
        await this.taleRental.setRentalFee(fee * 10000); //percent with two decimals

        let messageHash = soliditySha3(
            taleHero.address,
            1, 
            heroPrice, 
            taleToken.address, 
            86400, 
            654243505);            
        let signature = await web3.eth.sign(messageHash, accounts[0]);
        let result = await this.taleRental.rentHero(
            [accounts[0], taleToken.address, taleHero.address],
            [1, heroPrice, 86400, 654243505],
            signature, {from: accounts[1]});

        expectEvent(result, "RentHero", {
                renter: accounts[1],
                tokenContract: taleHero.address,
                tokenId: new BN(1),
                paymentToken: taleToken.address,
                price: new BN(heroPrice),
                fee: new BN(250)
            }, "Contract should emit correct RentHero event");

        let renterBalance = await taleToken.balanceOf(accounts[1]);        
        let feeBalance = await taleToken.balanceOf(accounts[2]);
        let herOwnerBalance = await taleToken.balanceOf(accounts[0]);
        let heroOwner = await taleHero.ownerOf(1);     
        let isHeroLocked = await taleHero.isLocked(1);
        let lockedUpTo = await taleHero.lockedTokens(1);
        let blockTimestamp = (await web3.eth.getBlock(result.receipt.blockNumber)).timestamp;
        assert.equal(renterBalance, 1000000 - heroPrice, "Invalid renter ERC20 balance after rent");
        assert.equal(feeBalance, heroPrice * fee, "Invalid fee ERC20 address balance after rent");
        assert.equal(herOwnerBalance, heroPrice - (heroPrice * fee), "Invalid hero owner ERC20 balance after rent");
        assert.equal(heroOwner, accounts[0], "Invalid hero owner");
        assert.ok(isHeroLocked, "Hero must be locked after rent");
        assert.equal(lockedUpTo - blockTimestamp, 86400, "Hero must be locked for the specified interval");        
    });
});
