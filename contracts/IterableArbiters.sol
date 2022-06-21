// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library IterableArbiters {

    struct UserVote {
        address voter;
        bool agree;
        bool voted;
    }

    struct Map {
        address[] keys;
        mapping(address => UserVote) values;
        mapping(address => uint) indexOf;
        mapping(address => bool) inserted;
    }

    function get(Map storage map, address key) public view returns (UserVote memory) {
        return map.values[key];
    }

    function getIndexOfKey(Map storage map, address key) public view returns (int) {
        if(!map.inserted[key]) {
            return -1;
        }
        return int(map.indexOf[key]);
    }

    function getKeyAtIndex(Map storage map, uint index) public view returns (address) {
        return map.keys[index];
    }



    function size(Map storage map) public view returns (uint) {
        return map.keys.length;
    }

    function set(Map storage map, address key, UserVote memory val) public {
        if (map.inserted[key]) {
            map.values[key] = val;
        } else {
            map.inserted[key] = true;
            map.values[key] = val;
            map.indexOf[key] = map.keys.length;
            map.keys.push(key);
        }
    }

    function remove(Map storage map, address key) public {
        if (!map.inserted[key]) {
            return;
        }

        delete map.inserted[key];
        delete map.values[key];

        uint index = map.indexOf[key];
        uint lastIndex = map.keys.length - 1;
        address lastKey = map.keys[lastIndex];

        map.indexOf[lastKey] = index;
        delete map.indexOf[key];

        map.keys[index] = lastKey;
        map.keys.pop();

    }

    function asArray(Map storage map) view public returns (UserVote[] memory) {
        UserVote[] memory result = new UserVote[](map.keys.length);

        for (uint256 index = 0; index < map.keys.length; index++) {
            result[index] = map.values[map.keys[index]];
        }
        return result;
    }
}