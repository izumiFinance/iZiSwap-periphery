// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

// import "hardhat/console.sol";

interface IiZiSwapPool {

    function state() external view
    returns(
        uint160 sqrtPrice_96,
        int24 currentPoint,
        uint16 observationCurrentIndex,
        uint16 observationQueueLen,
        uint16 observationNextQueueLen,
        bool locked,
        uint128 liquidity,
        uint128 liquidityX
    );
    
    function observations(uint256 index)
        external
        view
        returns (
            uint32 timestamp,
            int56 accPoint,
            bool init
        );

    function observe(uint32[] calldata secondsAgos)
        external
        view
        returns (int56[] memory accPoints);
}

contract Oracle {

    struct Observation {
        uint32 blockTimestamp;
        int56 accPoint;
        bool initialized;
    }

    /// @dev query a certain observation from uniswap pool
    /// @param pool address of uniswap pool
    /// @param observationIndex index of wanted observation
    /// @return observation desired observation, see Observation to learn more
    function getObservation(address pool, uint observationIndex)
        internal
        view
        returns (Observation memory observation) 
    {
        (
            observation.blockTimestamp,
            observation.accPoint,
            observation.initialized
        ) = IiZiSwapPool(pool).observations(observationIndex);
    }

    /// @dev query oldest observation
    /// @param pool address of uniswap pool
    /// @param latestIndex index of latest observation in the pool
    /// @param observationCardinality size of observation queue in the pool
    /// @return oldestObservation
    function getOldestObservation(address pool, uint16 latestIndex, uint16 observationCardinality)
        internal
        view
        returns (Observation memory oldestObservation)
    {
        uint16 oldestIndex = (latestIndex + 1) % observationCardinality;
        oldestObservation = getObservation(pool, oldestIndex);
        if (!oldestObservation.initialized) {
            oldestIndex = 0;
            oldestObservation = getObservation(pool, 0);
        }
    }

    struct State {
        int24 currentPoint;
        uint160 sqrtPrice_96;
        uint16 observationCurrentIndex;
        uint16 observationQueueLen;
        uint16 observationNextQueueLen;
    }

    function getState(address pool) 
        internal
        view
        returns (State memory state) {
        (
            uint160 sqrtPrice_96,
            int24 currentPoint,
            uint16 observationCurrentIndex,
            uint16 observationQueueLen,
            uint16 observationNextQueueLen,
            ,
            ,
        ) = IiZiSwapPool(pool).state();
        state.currentPoint = currentPoint;
        state.sqrtPrice_96 = sqrtPrice_96;
        state.observationCurrentIndex = observationCurrentIndex;
        state.observationQueueLen = observationQueueLen;
        state.observationNextQueueLen = observationNextQueueLen;
    }

    function _getTWAPointFromTarget(address pool, uint32 targetTimestamp)
        internal
        view
        returns (int24 point) 
    {
        uint32[] memory secondsAgo = new uint32[](2);
        secondsAgo[0] = uint32(block.timestamp) - targetTimestamp;
        secondsAgo[1] = 0;
        int56[] memory accPoints = IiZiSwapPool(pool).observe(secondsAgo);
        uint56 timeDelta = uint32(block.timestamp) - targetTimestamp;

        int56 pointAvg = (accPoints[1] - accPoints[0]) / int56(timeDelta);
        point = int24(pointAvg);
    }
    
    /// @notice query time weighted average (TWA) point(log price) of a swap pool.
    /// @param pool swap pool address
    /// @param delta seconds of time period, 
    ///        this interface calculates TWA point from delta ago to now
    ///        etc, the time period is [currentTime - delta, currentTime]
    /// @return enough whether oldest point in the observation queue is older than (currentTime - delta)
    /// @return avgPoint TWA point calculated
    /// @return oldestTime the oldest time of point in the observation queue.
    function getTWAPoint(address pool, uint256 delta)
        external
        view
        returns (bool enough, int24 avgPoint, uint256 oldestTime)
    {
        State memory state = getState(pool);
        // get oldest observation
        Observation memory oldestObservation;
        oldestObservation = getOldestObservation(pool, state.observationCurrentIndex, state.observationQueueLen);

        if (delta == 0) {
            return (true, state.currentPoint, oldestObservation.blockTimestamp);
        }

        if (uint256(oldestObservation.blockTimestamp) <= block.timestamp - delta) {
            uint256 targetTime = block.timestamp - delta;
            avgPoint = _getTWAPointFromTarget(pool, uint32(targetTime));
            return (true, avgPoint, oldestObservation.blockTimestamp);
        } else {
            uint256 targetTime = oldestObservation.blockTimestamp;
            avgPoint = _getTWAPointFromTarget(pool, uint32(targetTime));
            return (false, avgPoint, oldestObservation.blockTimestamp);
        }
    }
}