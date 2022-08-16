const { expectEvent, expectRevert, BN } = require("@openzeppelin/test-helpers");
const { soliditySha3 } = require("web3-utils");
const Marketplace = artifacts.require("Marketplace");
const TalesOfChainHero = artifacts.require("TalesOfChainHero");
const MinterFactory = artifacts.require("MinterFactory");
const TaleToken = artifacts.require("TaleToken");

contract("Marketplace", async accounts => {   
    before(async () => {
        this.marketplace = await Marketplace.deployed();
        this.minterFactory = await MinterFactory.deployed();
        this.taleHero = await TalesOfChainHero.deployed();
        this.taleToken = await TaleToken.new(accounts[1], 1000000,
            "0x0000000000000000000000000000000000000001", 0,
            "0x0000000000000000000000000000000000000002", 0,
            "0x0000000000000000000000000000000000000003", 0,
            "0x0000000000000000000000000000000000000004", 0);
        this.feeToAddress = accounts[9];

        await this.taleHero.setMintFactory(this.minterFactory.address);
        await this.minterFactory.addMinter(accounts[0]);
        let mintResult = await this.minterFactory.mintTo(accounts[0], this.taleHero.address);
        this.taleHeroId = mintResult.logs[0].args.tokenId;
    });

    it("should get address for fee", async () => {       
        let result = await this.marketplace.getFeeToAddress(); 
        assert.equal(result, "0xD9e68327A19E11d38e1708d1c4d6149C4B007E38", "Unexpected address for fee");
    });

    it("should set address for fee", async () => {       
        await this.marketplace.setFeeToAddress(this.feeToAddress); 
        let result = await this.marketplace.getFeeToAddress(); 
        assert.equal(result, this.feeToAddress, "Unexpected address for fee");
    });

    it("should get marketplace fee percent", async () => {       
        let result = await this.marketplace.getMarketplaceFeePercent(); 
        assert.equal(result, 500, "Unexpected fee value");
    });

    it("should set marketplace fee percent", async () => {       
        await this.marketplace.setMarketplaceFeePercent(1000); //10% 
        let result = await this.marketplace.getMarketplaceFeePercent(); 
        assert.equal(result, 1000, "Unexpected fee value");
    });

    it("should put for sale NFT", async () => {       
        await this.taleHero.approve(this.marketplace.address, this.taleHeroId);
        let result = await this.marketplace.putForSale(this.taleHero.address, 
            this.taleHeroId,
            this.taleToken.address,
            500000);

        expectEvent(result, "UpForSale",  {
            nftContract: this.taleHero.address,
            tokenId: this.taleHeroId, 
            saleId: '1',
            owner: accounts[0],
            paymentErc20: this.taleToken.address,
            price: '500000'
        }, "Contract should emit correct UpForSale event");

        let newNftOwner = await this.taleHero.ownerOf(this.taleHeroId);
        assert.equal(newNftOwner, this.marketplace.address, "Marketplace should be new owner of NFT");
    });

    it("should not put for sale NFT twice", async () => {       
        await expectRevert(this.marketplace.putForSale(this.taleHero.address, 
            this.taleHeroId,
            this.taleToken.address,
            500000), "Marketplace: NFT already on sale");
    });

    it("should get sale options", async () => {       
        let result = await this.marketplace.getSaleOptions(this.taleHero.address, 
            this.taleHeroId);
        assert.equal(result.owner, accounts[0], "Unxepected NFT owner");
        assert.equal(result.paymentErc20, this.taleToken.address, "Unxepected payment token");
        assert.equal(result.price, '500000', "Unexpected price");
        assert.equal(result.saleId, '1', "Unexpected sale id");
        assert.equal(result.isActive, true, "Sale must be active");
    });

    it("not the nft owner should not cancel the sale", async () => {       
        await expectRevert(this.marketplace.cancelSale(this.taleHero.address, 
            this.taleHeroId, {from: accounts[1]}), "Markeplace: Only owner can cancel sale");
    });

    it("should cancel the sale", async () => {              
        let result = await this.marketplace.cancelSale(this.taleHero.address, 
            this.taleHeroId);

        expectEvent(result, "CancelSale",  {
            nftContract: this.taleHero.address,
            tokenId: this.taleHeroId, 
            saleId: '1',
            owner: accounts[0]
        }, "Contract should emit correct CancelSale event");

        let newNftOwner = await this.taleHero.ownerOf(this.taleHeroId);
        assert.equal(newNftOwner, accounts[0], "Marketplace should be new owner of NFT");
    });

    it("should not cancel the sale twice", async () => {    
        await expectRevert(this.marketplace.cancelSale(this.taleHero.address, 
            this.taleHeroId), "Marketplace: NFT is not for sale"); 
    });

    it("should buy nft", async () => {    
        //put for sale
        await this.taleHero.approve(this.marketplace.address, this.taleHeroId);
        await this.marketplace.putForSale(this.taleHero.address, 
            this.taleHeroId,
            this.taleToken.address,
            500000);

        await this.taleToken.approve(this.marketplace.address, 500000, { from: accounts[1] });
        let result = await this.marketplace.buy(this.taleHero.address, this.taleHeroId,
            { from: accounts[1] });
       
        expectEvent(result, "Sold",  {
            nftContract: this.taleHero.address,
            tokenId: this.taleHeroId, 
            saleId: '2',
            oldOwner: accounts[0],
            newOwner: accounts[1],
            paymentErc20: this.taleToken.address,
            price: '500000',
            fee: '50000'
        }, "Contract should emit correct CancelSale event");

        let sellerBalance = await this.taleToken.balanceOf(accounts[0]);
        let buyerBalance = await this.taleToken.balanceOf(accounts[1]);
        let feeAddressBalance = await this.taleToken.balanceOf(this.feeToAddress);
        let nftOwner = await this.taleHero.ownerOf(this.taleHeroId);
        let isOnSale = await this.marketplace.isOnSale(this.taleHero.address, this.taleHeroId);

        assert.equal(sellerBalance, '450000', "Unexpected seller balance");
        assert.equal(buyerBalance, '500000', "Unexpected buyer balance");
        assert.equal(feeAddressBalance, '50000', "Unexpected feeAddress balance");
        assert.equal(nftOwner, accounts[1], "Unexpected NFT owner");
        assert.equal(isOnSale, false, "NFT must be not for sale");
    });

    it("should not buy nft twice", async () => {    
        await expectRevert(this.marketplace.buy(this.taleHero.address, this.taleHeroId,
            { from: accounts[1] }), "Marketplace: NFT is not for sale");
    });

    it("should not buy when not enought funds", async () => {    
        //put for sale
        await this.taleHero.approve(this.marketplace.address, this.taleHeroId, 
            { from: accounts[1] });
        await this.marketplace.putForSale(this.taleHero.address, 
            this.taleHeroId,
            this.taleToken.address,
            500000, { from: accounts[1] });

        await this.taleToken.approve(this.marketplace.address, 500000, { from: accounts[3] });
        await expectRevert(this.marketplace.buy(this.taleHero.address, this.taleHeroId,
            { from: accounts[2] }), "Marketplace: Not enough funds");
    });
});
