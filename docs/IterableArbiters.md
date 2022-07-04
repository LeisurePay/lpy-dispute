# Solidity API

## IterableArbiters

### UserVote

```solidity
struct UserVote {
  address voter;
  bool agree;
  bool voted;
}
```

### Map

```solidity
struct Map {
  address[] keys;
  mapping(address &#x3D;&gt; struct IterableArbiters.UserVote) values;
  mapping(address &#x3D;&gt; uint256) indexOf;
  mapping(address &#x3D;&gt; bool) inserted;
}
```

### contains

```solidity
function contains(struct IterableArbiters.Map map, address key) public view returns (bool)
```

Check if `key` is in `map`

| Name | Type | Description |
| ---- | ---- | ----------- |
| map | struct IterableArbiters.Map | The storage map |
| key | address | The key to check if it is in `map` |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | if `key` is in `map` |

### get

```solidity
function get(struct IterableArbiters.Map map, address key) public view returns (struct IterableArbiters.UserVote)
```

Get the `UserVote` object of `key` in `map`

| Name | Type | Description |
| ---- | ---- | ----------- |
| map | struct IterableArbiters.Map | The storage map |
| key | address | The key to fetch the `UserVote` object of |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IterableArbiters.UserVote | `UserVote` of `key` |

### getIndexOfKey

```solidity
function getIndexOfKey(struct IterableArbiters.Map map, address key) public view returns (int256)
```

Get the Index of `key`

| Name | Type | Description |
| ---- | ---- | ----------- |
| map | struct IterableArbiters.Map | The storage map |
| key | address | The key to fetch index of |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | int256 | index of `key` |

### getKeyAtIndex

```solidity
function getKeyAtIndex(struct IterableArbiters.Map map, uint256 index) public view returns (address)
```

Get the `key` at `index`

| Name | Type | Description |
| ---- | ---- | ----------- |
| map | struct IterableArbiters.Map | The storage map |
| index | uint256 | The index of key to fetch |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | `key` at `index` |

### size

```solidity
function size(struct IterableArbiters.Map map) public view returns (uint256)
```

Get total keys in the `map`

| Name | Type | Description |
| ---- | ---- | ----------- |
| map | struct IterableArbiters.Map | The storage map |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | the length of `keys` |

### set

```solidity
function set(struct IterableArbiters.Map map, address key, struct IterableArbiters.UserVote val) public
```

Sets `key` to `val` and update other fields

_This function is used to update the `UserVote` object of `key` in `map`_

| Name | Type | Description |
| ---- | ---- | ----------- |
| map | struct IterableArbiters.Map | The storage map |
| key | address | Key to update |
| val | struct IterableArbiters.UserVote | Value to set `key` to |

### remove

```solidity
function remove(struct IterableArbiters.Map map, address key) public
```

Removes `key` from `map`

_Resets all `key` fields to default values_

| Name | Type | Description |
| ---- | ---- | ----------- |
| map | struct IterableArbiters.Map | The storage map |
| key | address | Key to remove |

### asArray

```solidity
function asArray(struct IterableArbiters.Map map) public view returns (struct IterableArbiters.UserVote[])
```

Returns all `UserVote` as an array

_Used by the consumer to get just the `UserVote` objects of all `keys` in `map`_

| Name | Type | Description |
| ---- | ---- | ----------- |
| map | struct IterableArbiters.Map | The storage map |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | struct IterableArbiters.UserVote[] | array of `UserVote` objects |

### keysAsArray

```solidity
function keysAsArray(struct IterableArbiters.Map map) public view returns (address[])
```

Returns all `keys`

_Used by the consumer to get just the `users`  in `map`_

| Name | Type | Description |
| ---- | ---- | ----------- |
| map | struct IterableArbiters.Map | The storage map |

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address[] | array of `address` objects |

