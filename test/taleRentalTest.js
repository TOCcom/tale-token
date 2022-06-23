const { expectEvent, expectRevert, BN } = require("@openzeppelin/test-helpers");
const { soliditySha3 } = require("web3-utils");
const TaleRental = artifacts.require("TaleRental");
const TalesOfChainHero = artifacts.require("TalesOfChainHero");
const MinterFactory = artifacts.require("MinterFactory");
const TaleToken = artifacts.require("TaleToken");

contract("TaleRental", async accounts => {   
    before(async () => {
        this.taleRental = await TaleRental.deployed();
        this.minterFactory = await MinterFactory.deployed();
        this.taleHero = await TalesOfChainHero.deployed();
        this.taleToken = await TaleToken.new(accounts[1], 1000000,
            "0x0000000000000000000000000000000000000001", 0,
            "0x0000000000000000000000000000000000000002", 0,
            "0x0000000000000000000000000000000000000003", 0,
            "0x0000000000000000000000000000000000000004", 0);

        await this.taleHero.setMintFactory(this.minterFactory.address);
        await this.minterFactory.addMinter(accounts[0]);
        await this.minterFactory.mintTo(accounts[0], this.taleHero.address);
        await this.taleRental.setRentalFee(0.025 * 10000); //percent with two decimals
    });

    it("should return message hash", async () => {       
        let messageHash = soliditySha3("0xd9145CCE52D386f254917e481eB44e9943F39138",
            1,  1000, "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", 1, 7, 654243504);
        let result = await this.taleRental.getMessageHash("0xd9145CCE52D386f254917e481eB44e9943F39138",
            1,  1000, "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", 1, 7, 654243504); 
        assert.equal(result, messageHash, "Invalid message hash");
    });

    it("should cancel signature", async () => {
        let messageHash = soliditySha3("0xd9145CCE52D386f254917e481eB44e9943F39138",
        1,  1000, "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", 1, 7, 654243504);
        let signature = await web3.eth.sign(messageHash, accounts[0]);
        let result = await this.taleRental.cancelSignature(
            [1, 1000, 1, 7, 654243504],
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
        let messageHash = soliditySha3("0xd9145CCE52D386f254917e481eB44e9943F39138",
        1,  1000, "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", 1, 7, 654243504);
        let signature = await web3.eth.sign(messageHash, accounts[0]);
        await expectRevert(this.taleRental.cancelSignature(
                [1, 1000, 1, 7, 654243504],
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
        await this.taleRental.setFeeToAddress(accounts[2]);
        let rentalAddress = await this.taleRental.feeToAddress();
        assert.equal(rentalAddress, accounts[2], "Rental fee address differs from the specified");
    });

    it("should mint and rent hero", async () => {
        const heroPricePerDay = 1000;
        const fee = 0.025; //2.5%
        const rentalDays = 1;
        const rentalPrice = rentalDays * heroPricePerDay;

        await this.taleToken.approve(this.taleRental.address, rentalPrice, {from: accounts[1]});

        let messageHash = soliditySha3(this.taleHero.address, 0, heroPricePerDay, 
            this.taleToken.address, 1, 7, 654243505);            
        let signature = await web3.eth.sign(messageHash, accounts[0]);
        let result = await this.taleRental.rentHero(
            [accounts[0], this.taleToken.address, this.taleHero.address],
            [0, heroPricePerDay, 1, 7, rentalDays, 654243505],
            signature, {from: accounts[1]});

        expectEvent(result, "RentHero", {
                renter: accounts[1],
                tokenContract: this.taleHero.address,
                tokenId: new BN(0),
                paymentToken: this.taleToken.address,
                amount: new BN(rentalPrice),
                fee: new BN(25)
            }, "Contract should emit correct RentHero event");

        let renterBalance = await this.taleToken.balanceOf(accounts[1]);        
        let feeBalance = await this.taleToken.balanceOf(accounts[2]);
        let herOwnerBalance = await this.taleToken.balanceOf(accounts[0]);
        let heroOwner = await this.taleHero.ownerOf(0);     
        let isHeroLocked = await this.taleHero.isLocked(0);
        let lockedUpTo = await this.taleHero.lockedTokens(0);
        let blockTimestamp = (await web3.eth.getBlock(result.receipt.blockNumber)).timestamp;

        assert.equal(renterBalance, 1000000 - rentalPrice, "Invalid renter ERC20 balance after rent");
        assert.equal(feeBalance, rentalPrice * fee, "Invalid fee ERC20 address balance after rent");
        assert.equal(herOwnerBalance, rentalPrice - (rentalPrice * fee), "Invalid hero owner ERC20 balance after rent");
        assert.equal(heroOwner, accounts[0], "Invalid hero owner");
        assert.ok(isHeroLocked, "Hero must be locked after rent");
        assert.equal(lockedUpTo - blockTimestamp, 86400, "Hero must be locked for the specified interval");        
    });

    it ("should not use one signature twice", async() => {
        const heroPricePerDay = 1000;
        const rentalDays = 2;
        const rentalPrice = rentalDays * heroPricePerDay;

        await this.taleToken.approve(this.taleRental.address, rentalPrice, {from: accounts[1]});

        let messageHash = soliditySha3(this.taleHero.address, 0, heroPricePerDay, 
            this.taleToken.address, 1, 7, 654243505);            
        let signature = await web3.eth.sign(messageHash, accounts[0]);

        await expectRevert(this.taleRental.rentHero(
            [accounts[0], this.taleToken.address, this.taleHero.address],
            [0, heroPricePerDay, 1, 7, rentalDays, 654243505],
            signature, {from: accounts[1]}), "TaleRental: Signature is used or canceled");
    });

    it ("should not rent locked token", async() => {
        const heroPricePerDay = 1000;
        const rentalDays = 2;
        const rentalPrice = rentalDays * heroPricePerDay;

        await this.taleToken.approve(this.taleRental.address, rentalPrice, {from: accounts[1]});

        let messageHash = soliditySha3(this.taleHero.address, 0, heroPricePerDay, 
            this.taleToken.address, 1, 7, 654243506);            
        let signature = await web3.eth.sign(messageHash, accounts[0]);

        await expectRevert(this.taleRental.rentHero(
            [accounts[0], this.taleToken.address, this.taleHero.address],
            [0, heroPricePerDay, 1, 7, rentalDays, 654243506],
            signature, {from: accounts[1]}), "TaleRental: Token is already locked");
    });

    it("should not rent hero when rent period more then max", async () => {
        const heroPricePerDay = 1000;
        const rentalDays = 8; //max period - 7
        const rentalPrice = rentalDays * heroPricePerDay;

        await this.taleToken.approve(this.taleRental.address, rentalPrice, {from: accounts[1]});

        let messageHash = soliditySha3(this.taleHero.address, 0, heroPricePerDay, 
            this.taleToken.address, 1, 7, 654243507);            
        let signature = await web3.eth.sign(messageHash, accounts[0]);

        await expectRevert(this.taleRental.rentHero(
            [accounts[0], this.taleToken.address, this.taleHero.address],
            [0, heroPricePerDay, 1, 7, rentalDays, 654243507],
            signature, {from: accounts[1]}), "TaleRental: Rental time is longer than maximum");
    });

    it("should not rent hero when rent period less then min", async () => {
        const heroPricePerDay = 1000;
        const rentalDays = 1; //min period - 2
        const rentalPrice = rentalDays * heroPricePerDay;

        await this.taleToken.approve(this.taleRental.address, rentalPrice, {from: accounts[1]});

        let messageHash = soliditySha3(this.taleHero.address, 0, heroPricePerDay, 
            this.taleToken.address, 2, 7, 654243508);            
        let signature = await web3.eth.sign(messageHash, accounts[0]);

        await expectRevert(this.taleRental.rentHero(
            [accounts[0], this.taleToken.address, this.taleHero.address],
            [0, heroPricePerDay, 2, 7, rentalDays, 654243508],
            signature, {from: accounts[1]}), "TaleRental: Less than minimum rental time");
    });
});
