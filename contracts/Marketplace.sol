// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Marketplace is Ownable {

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
        uint256 price
    );
    event CancellSale(
        address indexed nftContract, 
        uint256 indexed tokenId,
        uint256 indexed saleId, 
        address owner);
    
    mapping(address => mapping(uint256 => SaleOptions)) public sales;
    uint256 saleCount = 0;

    struct SaleOptions {
        address owner;
        address paymentErc20;
        uint256 price;      
        uint256 saleId;  
        bool isActive;
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
        IERC721 nft = IERC721(nftContract);
        uint256 saleId = ++saleCount;
        sales[nftContract][tokenId] = SaleOptions(_msgSender(), paymentErc20, price, saleId, true);
        
        nft.safeTransferFrom(_msgSender(), address(this), tokenId);

        emit UpForSale(nftContract, tokenId, saleId, _msgSender(), paymentErc20, price);

        return saleId;
    }

    function cancelSale(address nftContract, uint256 tokenId) external returns(uint256) {
        SaleOptions memory saleOptions = sales[nftContract][tokenId];
        require(saleOptions.owner == _msgSender() || owner() == _msgSender(), 
            "Markeplace: Only owner can cancell sale");
        IERC721 nft = IERC721(nftContract);
        
        delete sales[nftContract][tokenId];

        nft.safeTransferFrom(address(this), saleOptions.owner, tokenId);

        emit CancellSale(nftContract, tokenId, saleOptions.saleId, saleOptions.owner);

        return saleOptions.saleId;
    }

    function buy(address nftContract, uint256 tokenId) external {
        SaleOptions memory saleOptions = sales[nftContract][tokenId];
        require(saleOptions.isActive, "Marketplace: NFT is not for sale");

        IERC20 paymentToken = IERC20(saleOptions.paymentErc20);
        require(paymentToken.balanceOf(_msgSender()) >= saleOptions.price,
            "Marketplace: Not enough funds");
        require(paymentToken.allowance(_msgSender(), address(this)) >= saleOptions.price,
            "TaleRental: Renter doesn't approve TaleRental to spend payment amount");
        
        IERC721 nft = IERC721(nftContract);
        delete sales[nftContract][tokenId];

        paymentToken.safeTransferFrom(_msgSender(), saleOptions.owner, saleOptions.price);
        nft.safeTransferFrom(address(this), _msgSender(), tokenId);

        emit Sold(
            nftContract,
            tokenId, 
            saleOptions.saleId, 
            saleOptions.owner, 
            _msgSender(), 
            saleOptions.paymentErc20,
            saleOptions.price
        );
    }

    function isOnSale(address nftContract, uint256 tokenId) public view returns(bool) {
        return sales[nftContract][tokenId].isActive;
    }
}