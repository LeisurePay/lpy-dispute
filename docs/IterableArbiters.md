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

### get

```solidity
function get(struct IterableArbiters.Map map, address key) public view returns (struct IterableArbiters.UserVote)
```

### getIndexOfKey

```solidity
function getIndexOfKey(struct IterableArbiters.Map map, address key) public view returns (int256)
```

### getKeyAtIndex

```solidity
function getKeyAtIndex(struct IterableArbiters.Map map, uint256 index) public view returns (address)
```

### size

```solidity
function size(struct IterableArbiters.Map map) public view returns (uint256)
```

### set

```solidity
function set(struct IterableArbiters.Map map, address key, struct IterableArbiters.UserVote val) public
```

### remove

```solidity
function remove(struct IterableArbiters.Map map, address key) public
```

### asArray

```solidity
function asArray(struct IterableArbiters.Map map) public view returns (struct IterableArbiters.UserVote[])
```

### keysAsArray

```solidity
function keysAsArray(struct IterableArbiters.Map map) public view returns (address[])
```

