// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20Vesting.sol";

contract TaleToken is ERC20Vesting {

    struct InstantBeneficiary {
        address beneficiary;
        uint256 amount;
    }

    uint256 private vestingPeriod = 2592000;                    // 30 days

    uint256 private privateSaleVestingStart = 1645574400;       // 2022-02-23T00:00:00Z
    uint256 private privateSaleVestingDuration = 31536000;      // 365 days
    
    uint256 private teamAndAdvisorVestingStart = 1677110400;    // 2023-02-23T00:00:00Z  
    uint256 private teamAndAdvisorVestingDuration = 104976000;  // 1215 days
    
    uint256 private ecosystemVestingStart = 1647993600;         // 2022-03-23T00:00:00Z                
    uint256 private ecosystemVestingDuration = 126230400;       // 4 years
    
    uint256 private marketingVestingStart = 1645574400;         // 2022-02-23T00:00:00Z
    uint256 private marketingVestingDuration = 52272000;        // 605 days
    
    uint256 private exchangeFeeVestingStart = 1645574400;       // 2022-02-23T00:00:00Z
    uint256 private exchangeFeeVestingDuration = 31536000;      // 365 days
    
    address[] private privateSaleVestingAddresses;
    address[] private teamAndAdvisorVestingAddresses;
    address[] private ecosystemVestingAddresses;
    address[] private marketingVestingAddresses;
    address[] private exchangeFeeVestingAddresses;

    InstantBeneficiary public publicSaleBeneficiary;
    InstantBeneficiary public privateSaleBeneficiary;
    InstantBeneficiary public ecosystemBeneficiary;
    InstantBeneficiary public exchangeFeeBeneficiary;
    InstantBeneficiary public marketingBeneficiary;

    constructor(address publicSaleAddress, uint256 publicSaleAmount,
        address privateSaleAdddress, uint256 privateSaleAmount,
        address ecosystemAddress, uint256 ecosystemAmount,
        address exchangeFeeAddress, uint256 exchangeFeeAmount,
        address marketingAddress, uint256 marketingAmount) ERC20("Tales of Chain", "TALE") {
            _mint(address(this), 2000000000 * 10 ** decimals());

            _transfer(address(this), publicSaleAddress, publicSaleAmount);
            _transfer(address(this), privateSaleAdddress, privateSaleAmount);
            _transfer(address(this), ecosystemAddress, ecosystemAmount);
            _transfer(address(this), exchangeFeeAddress, exchangeFeeAmount);
            _transfer(address(this), marketingAddress, marketingAmount);
            
            publicSaleBeneficiary = InstantBeneficiary(publicSaleAddress, publicSaleAmount);
            privateSaleBeneficiary = InstantBeneficiary(privateSaleAdddress, privateSaleAmount);
            ecosystemBeneficiary = InstantBeneficiary(ecosystemAddress, ecosystemAmount);
            exchangeFeeBeneficiary = InstantBeneficiary(exchangeFeeAddress, exchangeFeeAmount);
            marketingBeneficiary = InstantBeneficiary(marketingAddress, marketingAmount);
    }

    /**
    * @notice Adds beneficiary and amount for private sale vesting
    *         One address can participate in one vesting
    *
    * @param beneficiary address of the beneficiary to whom vested tokens are transferred
    * @param amount total amount of tokens to be released at the end of the vesting
    */
    function addPrivateSaleVestingAddress(address beneficiary, uint256 amount) onlyOwner external {
        _createVestingSchedule(
            beneficiary, 
            privateSaleVestingStart, 
            privateSaleVestingDuration, 
            vestingPeriod,
            amount);
        privateSaleVestingAddresses.push(beneficiary);
    }

    /**
    * @notice Adds beneficiary and amount for team/advisor vesting
    *         One address can participate in one vesting
    *
    * @param beneficiary address of the beneficiary to whom vested tokens are transferred
    * @param amount total amount of tokens to be released at the end of the vesting
    */
    function addTeamAndAdvisorVestingAddress(address beneficiary, uint256 amount) onlyOwner external {
        _createVestingSchedule(
            beneficiary, 
            teamAndAdvisorVestingStart, 
            teamAndAdvisorVestingDuration, 
            vestingPeriod,
            amount);
        teamAndAdvisorVestingAddresses.push(beneficiary);
    }

    /**
    * @notice Adds beneficiary and amount for ecosustem vesting
    *         One address can participate in one vesting
    *
    * @param beneficiary address of the beneficiary to whom vested tokens are transferred
    * @param amount total amount of tokens to be released at the end of the vesting
    */
    function addEcosystemVestingAddress(address beneficiary, uint256 amount) onlyOwner external {
        _createVestingSchedule(
            beneficiary, 
            ecosystemVestingStart, 
            ecosystemVestingDuration, 
            vestingPeriod,
            amount);
        ecosystemVestingAddresses.push(beneficiary);
    }

    /**
    * @notice Adds beneficiary and amount for marketing vesting
    *         One address can participate in one vesting
    *
    * @param beneficiary address of the beneficiary to whom vested tokens are transferred
    * @param amount total amount of tokens to be released at the end of the vesting
    */
    function addMarketingVestingAddress(address beneficiary, uint256 amount) onlyOwner external {
        _createVestingSchedule(
            beneficiary, 
            marketingVestingStart, 
            marketingVestingDuration, 
            vestingPeriod,
            amount);
        marketingVestingAddresses.push(beneficiary);
    }

    /**
    * @notice Adds beneficiary and amount for exchange fee vesting
    *         One address can participate in one vesting
    *
    * @param beneficiary address of the beneficiary to whom vested tokens are transferred
    * @param amount total amount of tokens to be released at the end of the vesting
    */
    function addExchangeFeeVestingAddress(address beneficiary, uint256 amount) onlyOwner external {
        _createVestingSchedule(
            beneficiary, 
            exchangeFeeVestingStart, 
            exchangeFeeVestingDuration, 
            vestingPeriod,
            amount);
        exchangeFeeVestingAddresses.push(beneficiary);
    }

    /**
    * @notice Returns the number of benefeciary for private sale vesting
    * @return the number of benefeciary
    */
    function getPrivateSaleVestingAddressCount() external view returns(uint256) {
        return privateSaleVestingAddresses.length;
    }

    /**
    * @notice Returns the number of benefeciary for team/advisor vesting
    * @return the number of benefeciary
    */
    function getTeamAndAdvisorVestingAddressCount() external view returns(uint256) {
        return teamAndAdvisorVestingAddresses.length;
    }

    /**
    * @notice Returns the number of benefeciary for ecosystem vesting
    * @return the number of benefeciary
    */
    function getEcosystemVestingAddressCount() external view returns(uint256) {
        return ecosystemVestingAddresses.length;
    }

    /**
    * @notice Returns the number of benefeciary for marketing vesting
    * @return the number of benefeciary
    */
    function getMarketingVestingAddressCount() external view returns(uint256) {
        return marketingVestingAddresses.length;
    }

    /**
    * @notice Returns the number of benefeciary for exchange fee vesting
    * @return the number of benefeciary
    */
    function getExchangeFeeVestingAddressCount() external view returns(uint256) {
        return exchangeFeeVestingAddresses.length;
    }

    /**
    * @notice Returns the benefeciary by index for private sale vesting
    * @param index beneficiary index for private sale vesting
    * @return the address of benefeciary
    */
    function getPrivateSaleVestingAddress(uint256 index) external view returns(address) {
        require(index < privateSaleVestingAddresses.length, "Invalid address index");
        return privateSaleVestingAddresses[index];
    }

    /**
    * @notice Returns the benefeciary by index for team/advisor vesting
    * @param index beneficiary index for team/advisor vesting
    * @return the address of benefeciary
    */
    function getTeamAndAdvisorVestingAddress(uint256 index) external view returns(address) {
        require(index < teamAndAdvisorVestingAddresses.length, "Invalid address index");
        return teamAndAdvisorVestingAddresses[index];
    }

    /**
    * @notice Returns the benefeciary by index for ecosystem vesting
    * @param index beneficiary index for ecosystem vesting
    * @return the address of benefeciary
    */
    function getEcosystemVestingAddress(uint256 index) external view returns(address) {
        require(index < ecosystemVestingAddresses.length, "Invalid address index");
        return ecosystemVestingAddresses[index];
    }

    /**
    * @notice Returns the benefeciary by index for marketing vesting
    * @param index beneficiary index for ecosystem vesting
    * @return the address of benefeciary
    */
    function getMarketingVestingAddress(uint256 index) external view returns(address) {
        require(index < marketingVestingAddresses.length, "Invalid address index");
        return marketingVestingAddresses[index];
    }

    /**
    * @notice Returns the benefeciary by index for exchange fee vesting
    * @param index beneficiary index for exchange fee vesting
    * @return the address of benefeciary
    */
    function getExchangeFeeVestingAddress(uint256 index) external view returns(address) {
        require(index < exchangeFeeVestingAddresses.length, "Invalid address index");
        return exchangeFeeVestingAddresses[index];
    }
}