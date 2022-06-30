// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract BuyPack is Ownable {

    using SafeERC20 for IERC20;

    event PackBought(address buyer, uint256 dealId, uint256 amount);

    address private gameServer;
    address private beneficiary;
    IERC20 private taleToken;

    constructor(
        address gameServerAddress,
        address beneficiaryAddress,
        address taleTokenAddress
    ) {
        gameServer = gameServerAddress;
        beneficiary = beneficiaryAddress;
        taleToken = IERC20(taleTokenAddress);        
    }

    /**
    * @notice Verifies the signature, balance and transfers the specified 
    *         number of tokens to the address of the beneficiary. 
    *
    * @param dealId Id of deal
    * @param amount Amount of TALE tokens.
    * @param signature Signed dealId and amount
    */
    function buy(uint256 dealId, uint256 amount, bytes calldata signature) external {
        bytes32 criteriaMessageHash = getMessageHash(dealId, amount);
        bytes32 signedMessageHash = ECDSA.toEthSignedMessageHash(criteriaMessageHash);
        require(ECDSA.recover(signedMessageHash, signature) == gameServer, 
            "TaleBuyPack: Invalid signature");

        require(taleToken.balanceOf(_msgSender()) >= amount, 
            "TaleBuyPack: Buyer doesn't have enough token to buy this pack");
        require(taleToken.allowance(_msgSender(), address(this)) >= amount, 
            "TaleBuyPack: Buyer doesn't approve TaleBuyPack to spend payment amount");
        
        taleToken.safeTransferFrom(_msgSender(), beneficiary, amount);

        emit PackBought(_msgSender(), dealId, amount);
    }

    function getMessageHash(uint256 dealId, uint256 amount) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(dealId, amount));
    }

    function setGameServer(address gameServerAddress) external onlyOwner {
        gameServer = gameServerAddress;
    }

    function setTaleToken(address taleTokenAddress) external onlyOwner {
        taleToken = IERC20(taleTokenAddress);
    }

    function setBeneficiary(address beneficiaryAddress) external onlyOwner {
        beneficiary = beneficiaryAddress;
    }

    function getGameServer() public view returns(address) {
        return gameServer;
    }

    function getTaleToken() public view returns(address) {
        return address(taleToken);
    }

    function getBeneficiary() public view returns(address) {
        return beneficiary;
    }
}