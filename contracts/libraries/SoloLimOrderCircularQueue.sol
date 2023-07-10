// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity ^0.8.4;

import "./SoloLimOrder.sol";

library SoloLimOrderCircularQueue {

    struct Queue {
        // start, start+1, ..., MAX_LENGTH-1, 0, 1, ..., start-1
        uint128 start;
        SoloLimOrder[] limOrders;
    }

    function add(Queue storage queue, SoloLimOrder memory limOrder, uint128 capacity) internal {
        if (queue.limOrders.length < capacity) {
            queue.limOrders.push(limOrder);
        } else {
            queue.limOrders[queue.start] = limOrder;
            queue.start = (queue.start + 1) % uint128(queue.limOrders.length);
        }
    }

}