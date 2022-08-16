// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

contract Marketplace is Ownable, ERC721Holder {

    using SafeERC20 for IERC20;
    
    event UpForSale(
        address indexed nftContract, 
        uint256 indexed tokenId,
        uint256 indexed saleId,
        address owner,
        address paymentErc20,
        uint256 price
    );
    event Sold(
        address indexed nftContract, 
        uint256 indexed tokenId,
        uint256 indexed saleId,
        address oldOwner,
        address newOwner,        
        address paymentErc20,
        uint256 price,
        uint256 fee
    );
    event CancelSale(
        address indexed nftContract, 
        uint256 indexed tokenId,
        uint256 indexed saleId, 
        address owner
    );
    
    mapping(address => mapping(uint256 => SaleOptions)) private sales;
    address private feeToAddress;    
    uint256 private marketPlaceFeePercent; //percent with two decimals 1% == 100
    uint256 private saleCount = 0;

    struct SaleOptions {
        address owner;
        address paymentErc20;
        uint256 price;      
        uint256 saleId;  
        bool isActive;
    }

    constructor(address _feeToAddress, uint256 _marketPlaceFeePercent) {
        feeToAddress = _feeToAddress;
        marketPlaceFeePercent = _marketPlaceFeePercent;
    }

    function putForSale(
        address nftContract, 
        uint256 tokenId,
        address paymentErc20,
        uint256 price
    ) 
        external returns(uint256) 
    {
        require(!sales[nftContract][tokenId].isActive, "Marketplace: NFT already on sale");
        require(price > 0, "Marketplace: Price must be greater than 0");
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == _msgSender(), "Marketplace: Only owner can put for sale NFT");
        uint256 saleId = ++saleCount;
        sales[nftContract][tokenId] = SaleOptions(_msgSender(), paymentErc20, price, saleId, true);
        
        nft.safeTransferFrom(_msgSender(), address(this), tokenId);

        emit UpForSale(nftContract, tokenId, saleId, _msgSender(), paymentErc20, price);

        return saleId;
    }

    function cancelSale(address nftContract, uint256 tokenId) external returns(uint256) {
        SaleOptions memory saleOptions = sales[nftContract][tokenId];
        require(saleOptions.isActive, "Marketplace: NFT is not for sale");
        require(saleOptions.owner == _msgSender() || owner() == _msgSender(), 
            "Markeplace: Only owner can cancel sale");
        IERC721 nft = IERC721(nftContract);
        
        delete sales[nftContract][tokenId];

        nft.safeTransferFrom(address(this), saleOptions.owner, tokenId);

        emit CancelSale(nftContract, tokenId, saleOptions.saleId, saleOptions.owner);

        return saleOptions.saleId;
    }

    function buy(address nftContract, uint256 tokenId) external {
        SaleOptions memory saleOptions = sales[nftContract][tokenId];
        require(saleOptions.isActive, "Marketplace: NFT is not for sale");

        IERC20 paymentToken = IERC20(saleOptions.paymentErc20);
        require(paymentToken.balanceOf(_msgSender()) >= saleOptions.price,
            "Marketplace: Not enough funds");
        require(paymentToken.allowance(_msgSender(), address(this)) >= saleOptions.price,
            "Marketplace: Buyer doesn't approve Marketplace to spend payment amount");
        
        IERC721 nft = IERC721(nftContract);
        delete sales[nftContract][tokenId];

        uint256 fee = saleOptions.price * marketPlaceFeePercent / 10000;
        uint256 sellerAmount = saleOptions.price - fee;

        paymentToken.safeTransferFrom(_msgSender(), feeToAddress, fee);
        paymentToken.safeTransferFrom(_msgSender(), saleOptions.owner, sellerAmount);
        nft.safeTransferFrom(address(this), _msgSender(), tokenId);

        emit Sold(
            nftContract,
            tokenId, 
            saleOptions.saleId, 
            saleOptions.owner, 
            _msgSender(), 
            saleOptions.paymentErc20,
            saleOptions.price,
            fee
        );
    }

    function isOnSale(address nftContract, uint256 tokenId) public view returns(bool) {
        return sales[nftContract][tokenId].isActive;
    }

    function setFeeToAddress(address _feeToAddress) external onlyOwner {
        require(address(_feeToAddress) != address(0x0), "Marketplace: Invalid fee address");
        feeToAddress = _feeToAddress;
    }

    function setMarketplaceFeePercent(uint256 percent) external onlyOwner {
        require(percent < 10000, "Marketplace: Commission percentage must be less than 100%");
        marketPlaceFeePercent = percent;
    }

    function getFeeToAddress() public view returns(address) {
        return feeToAddress;
    }

    function getMarketplaceFeePercent() public view returns(uint256) {
        return marketPlaceFeePercent;
    }

    function getSaleOptions(address nftContract, uint256 tokenId) public view returns(SaleOptions memory) {
        return sales[nftContract][tokenId];
    }
}