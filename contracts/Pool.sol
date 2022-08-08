// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;
import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";

contract Pool is Ownable {
    using SafeMath for uint256;
    using Address for address;

    event DepositReceived(address from, uint256 amount);
    event RewardsDistributed();
    event PaymentReleased(address to, uint256 amount);
    event PaymentReceived(address from, uint256 amount);

    uint256 private _totalDeposits = 0;
    uint256 private _totalReleased = 0;

    mapping(address => uint256) private _deposits;
    mapping(address => uint256) private _rewards;
    mapping(address => uint256) private _released;
    address[] private _payees;

    /**
     * @dev The Ether received will be logged with {PaymentReceived} events. Note that these events are not fully
     * reliable: it's possible for a contract to receive Ether without triggering this function. This only affects the
     * reliability of the events, and not the actual splitting of Ether.
     *
     * To learn more about this see the Solidity documentation for
     * https://solidity.readthedocs.io/en/latest/contracts.html#fallback-function[fallback
     * functions].
     */
    receive() external payable virtual {
        emit PaymentReceived(_msgSender(), msg.value);
    }

    /**
     * @dev Getter for the total amount of deposits made by users
     */
    function totalDeposits() public view returns (uint256) {
        return _totalDeposits;
    }

    /**
     * @dev Getter for the total amount value released from contract
     */
    function totalReleased() public view returns (uint256) {
        return _totalReleased;
    }

    /**
     * @dev Getter for the amount of Ether already released to a payee.
     */
    function released(address account) public view returns (uint256) {
        return _released[account];
    }
    
    /**
     * @dev The main deposit function making users elligible to receive awards
     */
    function deposit() external payable virtual {
        address account = _msgSender();
        _payees.push(account);
        _deposits[account] = msg.value;
        _totalDeposits += msg.value;
        emit DepositReceived(account, msg.value);
    }

    /**
     * @dev Getter for the amount of deposits made by `account`
     */
    function deposits(address account) public view returns (uint256) {
        return _deposits[account];
    }

    /**
     * @dev The function that wher called, rewards users in the pool. Callable only by owner
     */
    function reward() external payable virtual onlyOwner  {
        uint256 amount = msg.value;

        for (uint256 i = 0; i < _payees.length; i++) {
            _rewards[_payees[i]] += amount.div(100 / _deposits[_payees[i]].mul(100).div(_totalDeposits));
        }
        emit RewardsDistributed();
    }

    /**
     * @dev Getter for the amount of rewards owed to `account`
     */
    function rewards(address account) public view returns (uint256) {
        return _rewards[account];
    }

    /**
     * @dev internal logic for computing the pending payment of an `account` given their deposit and rewards
     */
    function _pendingPayment(
        address account
    ) private view returns (uint256) {
        return _deposits[account].add(_rewards[account]);
    }

    /**
     * @dev Getter for the amount of payee's releasable Ether.
     */
    function releasable() public view returns (uint256) {
        return _pendingPayment(_msgSender());
    }

    /**
     * @dev Getter for the amount of payee's releasable Ether.
     */
    function releasable(address account) public view returns (uint256) {
        return _pendingPayment(account);
    }

    /**
     * @dev Triggers a transfer to sender of the amount of Ether they are owed, according to their deposited share of the total pool
     */
    function release() public virtual {
        uint256 _deposit = deposits(msg.sender);
        require(_deposit > 0, "account has no deposits");

        uint256 _reward = rewards(msg.sender);
        uint256 payment = _deposit.add(_reward);

        require(payment != 0, "account is not due payment");

        _released[msg.sender] += payment;
        _deposits[msg.sender] = 0;
        _rewards[msg.sender] = 0;
        _totalDeposits -= _deposit;
        _totalReleased += payment;

        Address.sendValue(payable(msg.sender), payment);
        emit PaymentReleased(msg.sender, payment);
    }

    /**
     * @dev Triggers a transfer to `account` of the amount of Ether they are owed, according to their deposited share of the total pool
     */
    function release(address payable account) public virtual onlyOwner {
        uint256 _deposit = deposits(account);
        require(_deposit > 0, "account has no deposits");

        uint256 _reward = rewards(account);
        uint256 payment = _deposit.add(_reward);

        require(payment != 0, "account is not due payment");

        _released[account] += payment;
        _deposits[account] = 0;
        _rewards[account] = 0;
        _totalDeposits -= _deposit;
        _totalReleased += payment;

        Address.sendValue(account, payment);
        emit PaymentReleased(account, payment);
    }

    /**
     * @dev Triggers a transfer to sender of the amount of Ether they specify with `amount`, withdrawing rewards first.
     */
    function release(uint256 amount) public virtual {
        uint256 _deposit = deposits(msg.sender);
        require(_deposit > 0, "account has no deposits");

        uint256 _reward = rewards(msg.sender);
        uint256 payment = _deposit.add(_reward);
        require(amount <= payment, "account cannot release more than what is owed");

        if(amount > _reward) {
            uint256 remainingDeposit = payment.sub(amount);
            _released[msg.sender] += amount;
            _deposits[msg.sender] = remainingDeposit;
            _rewards[msg.sender] = 0;
            _totalDeposits -= _deposit.sub(remainingDeposit);
        }

        if(amount <= _reward) {
            _released[msg.sender] += amount;
            _rewards[msg.sender] = _reward.sub(amount);
        }

        _totalReleased += amount;
        Address.sendValue(payable(msg.sender), amount);
        emit PaymentReleased(msg.sender, amount);
    }
}
