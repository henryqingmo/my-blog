---
title: leetcode 33
date: 2025-12-08T10:44:27+11:00
tags:
---

[leetcode](https://leetcode.com/problems/search-in-rotated-sorted-array/description/)

![2025-12-08T105733](2025-12-08T105733.png)

This is quite an interesting question, as it doesn't follow the standard divide and conquer structure. 

First realise that each time we cut in half, there would be one side that's sorted.  Because only the segment that's across the cut would be unsorted, but it's impossible for both sides of median to be across the cuts.

Secondly after we know that one side is sorted, we can directly check if target is inside the range and discard one half.

```python
class Solution:
    def search(self, nums: List[int], target: int) -> int:
        n = len(nums)

        # divide Step
        def divide(i, j):
            if i > j:
                return -1

            mid = i + (j - i) // 2

            if nums[mid] == target:
                return mid

            # Left half is sorted
            if nums[i] <= nums[mid]:
                # if inside the sorted left half,
                if nums[i] <= target < nums[mid]:
                    return divide(i, mid - 1)
                else:
                    return divide(mid + 1, j)
            else:
                if nums[mid] < target <= nums[j]:
                    return divide(mid + 1, j)
                else:
                    return divide(i, mid - 1)

        return divide(0, n - 1)

```


