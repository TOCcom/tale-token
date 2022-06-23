// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface ITalesOfChainHero {
  function lock(uint256 tokenId, uint256 timestamp) external;
  function ownerOf(uint256 tokenId) external returns (address);
  function isLocked(uint256 tokenId) external view returns (bool);
}

contract TaleRental is Ownable {
  using SafeERC20 for IERC20;

  event RentHero(address indexed renter, 
                 address indexed tokenContract, 
                 uint256 indexed tokenId, 
                 address paymentToken,
                 uint256 amount,                  
                 uint256 fee,
                 uint256 toTimestamp);
  event CancelSignature(address indexed tokenContract, uint256 indexed tokenId, bytes signature);

  address public feeToAddress; 
  uint256 public rentalFee; //percent with two decimals 1% == 100

  mapping(bytes => bool) public usedSignatures;

  constructor(address _feeToAddress, uint256 _rentalFee) {
    feeToAddress = _feeToAddress;
    rentalFee = _rentalFee;
  }

  function setFeeToAddress(address _feeToAddress) external onlyOwner {
    feeToAddress = _feeToAddress;
  }

  /**
    * @dev Set percent with two decimals 1% == 100
    */
  function setRentalFee(uint256 _rentalFee) external onlyOwner {
    require(_rentalFee <= 10000, "TaleRental: Fee cannot exceed 100%");
    rentalFee = _rentalFee;
  }

  function cancelSignature(
    uint256[5] calldata values, // 0:tokenId 1:pricePerDay 2:rentalPeriodInDaysMin 3:rentalPeriodInDaysMax 4:salt
    address paymentErc20,
    address tokenContract,
    bytes calldata signature
  ) external {
    require(!usedSignatures[signature], "TaleRental: This signature is used");
    bytes32 criteriaMessageHash = getMessageHash(tokenContract, values[0], values[1], paymentErc20, values[2], values[3], values[4]);
    bytes32 ethSignedMessageHash = ECDSA.toEthSignedMessageHash(criteriaMessageHash);
    require(ECDSA.recover(ethSignedMessageHash, signature) == _msgSender(), "TaleRental: Invalid hero owner signature");

    usedSignatures[signature] = true;
    emit CancelSignature(tokenContract, values[0], signature);
  }

  /**
   * @dev rent hero
   */
  function rentHero(
    address[3] calldata addresses, // 0:heroOwner 1:paymentErc20 2:taleHero
    uint256[6] calldata values, // 0:tokenId 1:pricePerDay 2:rentalPeriodInDaysMin 3:rentalPeriodInDaysMax 4:rentalDays 5:salt
    bytes calldata signature
  ) external {
    require(values[1] > 0, "TaleRental: Invalid payment amount");
    require(!usedSignatures[signature], "TaleRental: Signature is used or canceled");

    bytes32 criteriaMessageHash = getMessageHash(addresses[2], values[0], values[1], addresses[1], values[2], values[3], values[5]);
    bytes32 ethSignedMessageHash = ECDSA.toEthSignedMessageHash(criteriaMessageHash);
    require(ECDSA.recover(ethSignedMessageHash, signature) == addresses[0], "TaleRental: Invalid hero owner signature");
    require(values[2] <= values[4], "TaleRental: Less than minimum rental time");
    require(values[3] >= values[4], "TaleRental: Rental time is longer than maximum");
    require(values[4] > 0, "TaleRental: Minimum rental period is 1 day");

    uint256 amount = values[1] * values[4];
    IERC20 paymentContract = IERC20(addresses[1]);
    require(paymentContract.balanceOf(_msgSender()) >= amount, "TaleRental: Renter doesn't have enough token to rent this item");
    require(paymentContract.allowance(_msgSender(), address(this)) >= amount, "TaleRental: Renter doesn't approve TaleRental to spend payment amount");

    // lock tale hero
    ITalesOfChainHero nft = ITalesOfChainHero(addresses[2]);
    require(nft.ownerOf(values[0]) == addresses[0], "TaleRental: Hero owner is not owner of this item now");
    require(!nft.isLocked(values[0]), "TaleRental: Token is already locked");
    uint256 rentToTimestamp = values[4] * 1 days + block.timestamp;
    nft.lock(values[0], rentToTimestamp);

    // Transfer payment to owner and fee to address
    uint256 fee = rentalFee * amount / 10000;
    uint256 payToOwner = amount - fee;
    paymentContract.safeTransferFrom(_msgSender(), addresses[0], payToOwner);
    if (fee > 0) {
      paymentContract.safeTransferFrom(_msgSender(), feeToAddress, fee);
    }

    // set used signature
    usedSignatures[signature] = true;

    // Emit rent event
    emit RentHero(_msgSender(), addresses[2], values[0], addresses[1], amount, fee, rentToTimestamp);
  }

  function getMessageHash(
    address _tokenContract,
    uint256 _tokenId,
    uint256 _pricePerDay,
    address _paymentErc20,
    uint256 _rentalPeriodMin,
    uint256 _rentalPeriodMax,
    uint256 _saltNonce
  ) public pure returns (bytes32) {
    return keccak256(abi.encodePacked(_tokenContract, _tokenId, _pricePerDay, 
      _paymentErc20, _rentalPeriodMin, _rentalPeriodMax, _saltNonce));
  }
}