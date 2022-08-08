// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface IMinterFactory {
    function mintTo(address to, address tokenAddress) external;
}

contract CardPack is Ownable {

    using SafeERC20 for IERC20;

    event PackBought(
        address indexed buyer, 
        uint256 indexed dealId, 
        uint256 indexed amount, 
        bytes signature
    );
    event PackOpened(address indexed opener, uint256 indexed dealId, bytes signature);

    address private gameServer;
    address private beneficiary;
    IERC20 private taleToken;
    IMinterFactory private minterFactory;

    mapping(bytes => bool) public usedSignatures;

    constructor(
        address gameServerAddress,
        address beneficiaryAddress,
        address taleTokenAddress,
        address minterFactoryAddress
    ) {
        gameServer = gameServerAddress;
        beneficiary = beneficiaryAddress;
        taleToken = IERC20(taleTokenAddress);   
        minterFactory = IMinterFactory(minterFactoryAddress);  
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
        require(!usedSignatures[signature], "CardPack: Deal already paid");
        bytes32 criteriaMessageHash = getBuyMessageHash(dealId, amount);
        bytes32 messageHash = ECDSA.toEthSignedMessageHash(criteriaMessageHash);
        require(ECDSA.recover(messageHash, signature) == gameServer, 
            "CardPack: Invalid signature");

        require(taleToken.balanceOf(_msgSender()) >= amount, 
            "CardPack: Buyer doesn't have enough token to buy this pack");
        require(taleToken.allowance(_msgSender(), address(this)) >= amount, 
            "CardPack: Buyer doesn't approve CardPack to spend payment amount");

        usedSignatures[signature] = true;

        taleToken.safeTransferFrom(_msgSender(), beneficiary, amount);

        emit PackBought(_msgSender(), dealId, amount, signature);
    }

    function open(
        uint256 dealId,
        address[] calldata heroContracts,
        uint256[] calldata heroQuantities,
        bytes calldata signature
    ) 
        external 
    {
        require(!usedSignatures[signature], "CardPack: Pack already opened");
        require(heroContracts.length == heroQuantities.length, 
            "CardPack: Each contract must match the quantity");

        bytes32 criteriaMessageHash = getOpenMessageHash(dealId, heroContracts, heroQuantities);
        bytes32 messageHash = ECDSA.toEthSignedMessageHash(criteriaMessageHash);
        require(ECDSA.recover(messageHash, signature) == gameServer, 
            "CardPack: Invalid signature");

        for (uint256 i = 0; i < heroContracts.length; ++i) {
            for (uint256 j = 0; j < heroQuantities[i]; ++j) {
                minterFactory.mintTo(_msgSender(), heroContracts[i]);
            }
        }

        emit PackOpened(_msgSender(), dealId, signature);
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

    function setMinterFactory(address minterFactoryAddress) external onlyOwner {
        minterFactory = IMinterFactory(minterFactoryAddress);
    }

    function getBuyMessageHash(uint256 dealId, uint256 amount) public pure returns (bytes32) {
       return keccak256(abi.encodePacked(dealId, amount));
    }

    function getOpenMessageHash(
        uint256 dealId, 
        address[] calldata heroContracts, 
        uint256[] calldata heroQuantity
        ) public pure returns (bytes32) {
            return keccak256(abi.encodePacked(dealId, heroContracts, heroQuantity));
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

    function getMinterFactory() public view returns(address) {
        return address(minterFactory);
    }
}