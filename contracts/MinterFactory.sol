// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IMintableERC721 is IERC721 {
    function mint(address to) external returns(uint256);
}

contract MinterFactory is Ownable {

    event TokenMinted(address contractAddress, address to, uint256 indexed tokenId);

    mapping(address => bool) public minters;    

    /**
     * @dev mint function to distribute Tales Of Chain Hero to user
     */
    function mintTo(address to, address tokenAddress) external {
        require(minters[_msgSender()], "Only minter can mint token");
        IMintableERC721 erc721 = IMintableERC721(tokenAddress);
        uint256 tokenId = erc721.mint(to);
        emit TokenMinted(tokenAddress, to, tokenId);
    }

    /**
     * @dev Allows the address to mint tokens
     */
    function addMinter(address minter) external onlyOwner {
        require(!minters[minter], "Minter already exists");
        minters[minter] = true;
    }

    /**
     * @dev Forbids the address to mint tokens
     */
    function removeMinter(address minter) external onlyOwner {
        require(minters[minter], "Minter not exists");
        minters[minter] = false;
    }
}