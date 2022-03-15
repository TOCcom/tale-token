const truffleAssert = require('truffle-assertions');
const { soliditySha3 } = require("web3-utils");
const TaleRental = artifacts.require("TaleRental");
const TalesOfChainHero = artifacts.require("TalesOfChainHero");
const MinterFactory = artifacts.require("MinterFactory");
const TaleToken = artifacts.require("TaleToken");

contract("TaleRental", async accounts => {    
    it("should return message hash", async () => {       
        const instance = await TaleRental.deployed(); 
        let messageHash = soliditySha3(
            "0xd9145CCE52D386f254917e481eB44e9943F39138",
            1, 
            10000, 
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", 
            86400, 
            654243504);
        let result = await instance.getMessageHash.call(
            "0xd9145CCE52D386f254917e481eB44e9943F39138",
            1,
            10000,
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
            86400,
            654243504); 
        assert.equal(result, messageHash, "Invalid message hash");
    });

    it("should cancel signature", async () => {
        const instance = await TaleRental.deployed();
        let messageHash = soliditySha3(
            "0xd9145CCE52D386f254917e481eB44e9943F39138",
            1, 
            10000, 
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", 
            86400, 
            654243504);
        let signature = await web3.eth.sign(messageHash, accounts[0]);
        let result = await instance.cancelSignature(
            [1, 10000, 86400, 654243504],
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
            "0xd9145CCE52D386f254917e481eB44e9943F39138",
            signature);
        truffleAssert.eventEmitted(result, "CancelSignature", (ev) => {
                return ev.tokenContract === "0xd9145CCE52D386f254917e481eB44e9943F39138" &&
                        ev.tokenId == 1 && ev.signature === signature;
            }, "Contract should emit correct CancelSignature event");
    });

    it("should not cancel signature twice", async () => {
        const instance = await TaleRental.deployed();
        let messageHash = soliditySha3(
            "0xd9145CCE52D386f254917e481eB44e9943F39138",
            2, 
            10000, 
            "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4", 
            86400, 
            654243504);
        let signature = await web3.eth.sign(messageHash, accounts[0]);
        await truffleAssert.passes(instance.cancelSignature(
                [2, 10000, 86400, 654243504],
                "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
                "0xd9145CCE52D386f254917e481eB44e9943F39138",
                signature), "First call of 'cancelSignature' should not be failed");
        await truffleAssert.fails(instance.cancelSignature(
                [2, 10000, 86400, 654243504],
                "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
                "0xd9145CCE52D386f254917e481eB44e9943F39138",
                signature), truffleAssert.ErrorType.REVERT, "TaleRental: This signature is used");
    });

    it("should set rental fee", async () => {
        const instance = await TaleRental.deployed();
        await instance.setRentalFee(250);
        let rentalFee = await instance.rentalFee.call();
        assert.equal(rentalFee, 250, "Rental fee differs from the specified");
    });

    it("should set rental fee address", async () => {
        const instance = await TaleRental.deployed();        
        await instance.setFeeToAddress("0x17F6AD8Ef982297579C203069C1DbfFE4348c372");
        let rentalAddress = await instance.feeToAddress.call();
        assert.equal(rentalAddress, "0x17F6AD8Ef982297579C203069C1DbfFE4348c372", "Rental fee address differs from the specified");
    });

    it("should mint and rent hero", async () => {
        const heroPrice = 10000;
        const fee = 0.025; //2.5%

        const minter = await MinterFactory.deployed();
        const taleHero = await TalesOfChainHero.deployed();
        const taleRental = await TaleRental.deployed();
        const taleToken = await TaleToken.new(accounts[1], 1000000,
        "0x69dccf78085eb27e18e2641f0f4090d296b795e6", 1000000,
        "0xcd9d0a5a4c813869cf6a4b71b1d37a6a3e4a26f6", 1000000,
        "0x2759baf50fc2b3de8e20233e05d112c93fb1c3aa", 1000000,
        "0x03f30e3cc98ed22a77baf4d26bae94e3ad453a3a", 1000000);

        await taleHero.setMintFactory(minter.address);
        await minter.addMinter(accounts[0]);
        await minter.mintTo(accounts[0], taleHero.address);
        await taleToken.approve(taleRental.address, 10000, {from: accounts[1]});
        await taleRental.setFeeToAddress(accounts[2]);
        await taleRental.setRentalFee(fee * 10000); //percent with two decimals

        let messageHash = soliditySha3(
            taleHero.address,
            1, 
            heroPrice, 
            taleToken.address, 
            86400, 
            654243505);            
        let signature = await web3.eth.sign(messageHash, accounts[0]);
        let result = await taleRental.rentHero(
            [accounts[0], taleToken.address, taleHero.address],
            [1, heroPrice, 86400, 654243505],
            signature, {from: accounts[1]});


        truffleAssert.eventEmitted(result, "RentHero", (ev) => {
                return ev.renter === accounts[1] && ev.tokenContract === taleHero.address
                && ev.tokenId == 1 && ev.paymentToken === taleToken.address
                && ev.price == heroPrice && ev.fee == 250;
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
