// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Counter is Ownable, ERC20, PaymentSplitter {
    using SafeMath for uint;
    using SafeERC20 for address;

    uint256 count = 0;
    mapping(address => uint256) private _received;

    event CountedTo(uint256 number);

    constructor(string memory name, string memory symbol,  address[] memory payees, uint256[] memory shares) Ownable() ERC20(name, symbol) PaymentSplitter(payees, shares)  {}

    receive() external payable virtual override {
        _received[msg.sender] += msg.value;
        emit PaymentReceived(_msgSender(), msg.value);
    }

    function release(address payable account) public override {
        require(_received[account] > 0, "Counter: account has not deposited");
        super.release(account);
    }

    function _pendingPayment(
        address account,
        uint256 totalReceived,
        uint256 alreadyReleased
    ) private view override returns (uint256) {
        return (totalReceived * _shares[account]) / totalShares - alreadyReleased;
    }

    function getCount() public view returns (uint256) {
        return count;
    }

    function countUp() public returns (uint256) {
        console.log("countUp: count =", count);
        uint256 newCount = count + 1;
        require(newCount > count, "Uint256 overflow");
        count = newCount;
        emit CountedTo(count);
        return count;
    }

    function countDown() public returns (uint256) {
        console.log("countDown: count =", count);
        uint256 newCount = count - 1;
        require(newCount < count, "Uint256 underflow");
        count = newCount;
        emit CountedTo(count);
        return count;
    }
}
