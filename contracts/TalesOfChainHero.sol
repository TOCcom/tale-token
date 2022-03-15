// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract TalesOfChainHero is ERC721, Ownable
{
    using Strings for uint256;

    mapping(uint256 => uint256) public lockedTokens;
    string private _baseTokenURI;
    address private _minterFactory;
    address private _rentalContract;
    uint256 private _totalSupply;

    constructor(string memory baseTokenURI_, address minterFactory_, address rentalContract_) 
        ERC721("Tales Of Chain Hero", "TLH") {
            _baseTokenURI = baseTokenURI_;
            _minterFactory = minterFactory_;
            _rentalContract = rentalContract_;
    }

    /**
     * @dev Returns the number of issued tokens.
     */
    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev Returns the base token URI.
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json")) : "";
    }

    /**
     * @dev Returns the address of the minter factory.
     */
    function minterFactory() public view returns (address) {
        return _minterFactory;
    }

    /**
     * @dev Sets factory to mint item.
     */
    function setMintFactory(address factory) external onlyOwner {
        _minterFactory = factory;
    }

    /**
     * @dev Returns the address of the rental contract.
     */
    function rentalContract() public view returns (address) {
        return _rentalContract;
    }

    /**
     * @dev Sets the address of the rental contract.
     */
    function setRentalContract(address rental) external onlyOwner {
        _rentalContract = rental;
    }

    /**
     * @dev Creates a new token for `to`. Its token ID will be automatically
     * assigned (and available on the emitted {IERC721-Transfer} event), and the token
     * URI autogenerated based on the base URI passed at construction.
     *
     * See {ERC721-_mint}.
     *
     * Requirements:
     *
     * - the caller must be the minter factory.
     */
    function mint(address to) external returns(uint256) {
        require(minterFactory() == _msgSender(), "Only minter factory can mint");
        uint256 tokenId = _totalSupply + 1;
        require(!_exists(tokenId), "Must have unique tokenId");
        _totalSupply += 1;
        _mint(to, tokenId);    
        return tokenId;
    }

    /**
     * @dev Lock token for rental
     */
    function lock(uint256 tokenId, uint256 timestamp) external {
        require(rentalContract() == _msgSender() || owner() == _msgSender(), 
            "Only rental contract or owner can lock the token");
        require(_exists(tokenId), "Must be valid tokenId");
        require(lockedTokens[tokenId] < block.timestamp, "Token is already locked");
        lockedTokens[tokenId] = timestamp;
    }

    /**
     * @dev Unlock token to use blockchain or sale on marketplace
     */
    function unlock(uint256 tokenId) external {
        require(rentalContract() == _msgSender() || owner() == _msgSender(), 
            "Only rental contract or owner can unlock the token");
        require(_exists(tokenId), "Must be valid tokenId");
        require(lockedTokens[tokenId] >= block.timestamp, "Token has already unlocked");
        lockedTokens[tokenId] = 0;
    }

    /**
     * @dev Get lock status
     */
    function isLocked(uint256 tokenId) external view returns (bool) {
        return lockedTokens[tokenId] >= block.timestamp;
    }

    /**
     * @dev Set token URI
     */
    function updateBaseURI(string calldata baseTokenURI) external onlyOwner {
        _baseTokenURI = baseTokenURI;
    }

    /**
     * @dev See {IERC165-_beforeTokenTransfer}.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override {
        require(lockedTokens[tokenId] < block.timestamp, "Unable to transfer locked token");
        super._beforeTokenTransfer(from, to, tokenId);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view override returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}