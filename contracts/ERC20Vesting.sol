// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title ERC20 contract with vesting functionality
 *
 * This implementation does not allow one address to participate in multiple vests.
 *
 */
abstract contract ERC20Vesting is Ownable, ERC20Burnable {
    using SafeMath for uint256;
    struct VestingSchedule{
        bool initialized;
        uint256 start;
        uint256 duration;
        uint256 period;
        uint256 amountTotal;
        uint256 released;
    }

    mapping(address => VestingSchedule) private vestingSchedules;
    uint256 private vestingSchedulesTotalAmount;

    event Released(uint256 amount);

    /**
    * @notice Returns the vesting schedule for specified address.
    * @return the vesting schedule
    */
    function getVestingByAddress(address beneficiary) external view returns(VestingSchedule memory){
        VestingSchedule memory vestingSchedule = vestingSchedules[beneficiary];
        require(vestingSchedule.initialized, "TokenVesting: no vesting schedule for this address");
        return vestingSchedule;
    }

    /**
    * @notice Returns the total amount of vesting schedules.
    * @return the total amount of vesting schedules
    */
    function getVestingSchedulesTotalAmount() external view returns(uint256){
        return vestingSchedulesTotalAmount;
    }
    
    /**
    * @notice Release vested amount of tokens.
    */
    function release() public {
        address beneficiary = msg.sender;
        VestingSchedule storage vestingSchedule = vestingSchedules[beneficiary];
        require(vestingSchedule.initialized, "TokenVesting: no vesting schedule for current sender");
        uint256 vestedAmount = _computeReleasableAmount(vestingSchedule);
        require(vestedAmount > 0, "TokenVesting: cannot release tokens, no vested tokens");
        vestingSchedule.released = vestingSchedule.released.add(vestedAmount);
        vestingSchedulesTotalAmount = vestingSchedulesTotalAmount.sub(vestedAmount);
        _transfer(address(this), beneficiary, vestedAmount);
        emit Released(vestedAmount);
    }

    /**
    * @notice Computes the vested amount of tokens for the given address.
    * @return the vested token amount
    */
    function computeReleasableAmount(address beneficiary) public view returns(uint256){
        VestingSchedule storage vestingSchedule = vestingSchedules[beneficiary];
        require(vestingSchedule.initialized, "TokenVesting: no vesting schedule for this address");
        require(vestingSchedule.start < block.timestamp, "TokenVesting: this vetsing has not started yet");
        return _computeReleasableAmount(vestingSchedule);
    }

    /**
    * @notice Creates a new vesting schedule for a beneficiary.
    * @param beneficiary address of the beneficiary to whom vested tokens are transferred
    * @param start start time of the vesting period
    * @param duration duration in seconds of the period in which the tokens will vest
    * @param period duration of a slice period for the vesting in seconds
    * @param amount total amount of tokens to be released at the end of the vesting
    */
    function _createVestingSchedule(
        address beneficiary,
        uint256 start,
        uint256 duration,
        uint256 period,
        uint256 amount
    ) internal {
        require(balanceOf(address(this)) >= amount,
            "TokenVesting: cannot create vesting schedule because not sufficient tokens"
        );
        require(duration > 0, "TokenVesting: duration must be > 0");
        require(amount > 0, "TokenVesting: amount must be > 0");
        require(period >= 1, "TokenVesting: slicePeriodSeconds must be >= 1"); 
        require(vestingSchedulesTotalAmount.add(amount) <= totalSupply(), "TokenVesting: not enough free tokens");
        VestingSchedule storage vestingSchedule = vestingSchedules[beneficiary];
        require(!vestingSchedule.initialized, "TokenVesting: the address is already have vesting shedule");
        vestingSchedules[beneficiary] = VestingSchedule(
            true,
            start,
            duration,
            period,
            amount,
            0
        );
        vestingSchedulesTotalAmount = vestingSchedulesTotalAmount.add(amount);
    }

    /**
    * @notice Computes the releasable amount of tokens for a vesting schedule.
    * @return the amount of releasable tokens
    */
    function _computeReleasableAmount(VestingSchedule storage vestingSchedule) internal view returns(uint256){
        uint256 currentTime = block.timestamp;
        if (currentTime >= vestingSchedule.start.add(vestingSchedule.duration)) {
            return vestingSchedule.amountTotal.sub(vestingSchedule.released);
        } else {
            uint256 timeFromStart = currentTime.sub(vestingSchedule.start);
            uint256 period = vestingSchedule.period;
            uint256 vestedPeriods = timeFromStart.div(period);
            uint256 vestedSeconds = vestedPeriods.mul(period);
            uint256 vestedAmount = vestingSchedule.amountTotal.mul(vestedSeconds).div(vestingSchedule.duration);
            vestedAmount = vestedAmount.sub(vestingSchedule.released);
            return vestedAmount;
        }
    }
}