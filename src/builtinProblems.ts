// 内置题库：初学者 / 竞赛者两套经典公开算法题（离线内置，可直接导入）。
// 题目来源于 LeetCode / 洛谷 / NOIP 等公开经典题，代码为可编译运行的 C++ 参考解答。

export interface BuiltinProblem {
  title: string;
  statement: string;
  source: string;
  category: string[];
  difficulty: string;
  code: string;
}

export const beginnerProblems: BuiltinProblem[] = [
  {
    title: "两数之和",
    statement: "给定一个整数数组 nums 和一个目标值 target，请找出数组中和为目标值的两个整数的下标，并返回。假设每种输入只会对应一个答案，且不能重复使用同一个元素。\n输入：第一行 n target，第二行 n 个整数。输出：两个下标（空格分隔）。",
    source: "LeetCode 1",
    category: ["哈希表", "数组"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

int main() {
    int n, target;
    cin >> n >> target;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) cin >> nums[i];
    unordered_map<int, int> mp;
    for (int i = 0; i < n; i++) {
        int need = target - nums[i];
        if (mp.count(need)) {
            cout << mp[need] << " " << i << endl;
            return 0;
        }
        mp[nums[i]] = i;
    }
    return 0;
}`,
  },
  {
    title: "反转链表",
    statement: "给定一个单链表的头节点，反转链表并返回反转后的头节点。\n输入：第一行 n，第二行 n 个整数（链表节点值）。输出：反转后的链表值（空格分隔）。",
    source: "LeetCode 206",
    category: ["链表", "迭代"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
using namespace std;

struct ListNode {
    int val;
    ListNode* next;
    ListNode(int x) : val(x), next(nullptr) {}
};

int main() {
    int n;
    cin >> n;
    ListNode* head = nullptr;
    ListNode* tail = nullptr;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        ListNode* node = new ListNode(x);
        if (!head) head = tail = node;
        else { tail->next = node; tail = node; }
    }
    ListNode* prev = nullptr;
    ListNode* cur = head;
    while (cur) {
        ListNode* nxt = cur->next;
        cur->next = prev;
        prev = cur;
        cur = nxt;
    }
    for (ListNode* p = prev; p; p = p->next) cout << p->val << " ";
    cout << endl;
    return 0;
}`,
  },
  {
    title: "有效的括号",
    statement: "给定一个只包含 '(' ')' '{' '}' '[' ']' 的字符串，判断字符串中的括号是否有效配对。\n输入：一个字符串。输出：true 或 false。",
    source: "LeetCode 20",
    category: ["栈", "字符串"],
    difficulty: "简单",
    code: `#include <iostream>
#include <stack>
#include <string>
using namespace std;

int main() {
    string s;
    cin >> s;
    stack<char> st;
    for (char c : s) {
        if (c == '(' || c == '[' || c == '{') st.push(c);
        else {
            if (st.empty()) { cout << "false" << endl; return 0; }
            char t = st.top();
            if ((c == ')' && t == '(') || (c == ']' && t == '[') || (c == '}' && t == '{')) st.pop();
            else { cout << "false" << endl; return 0; }
        }
    }
    cout << (st.empty() ? "true" : "false") << endl;
    return 0;
}`,
  },
  {
    title: "二分查找",
    statement: "给定一个升序排列的整数数组和一个目标值，返回目标值在数组中的下标；若不存在则返回 -1。\n输入：第一行 n target，第二行 n 个升序整数。输出：下标或 -1。",
    source: "LeetCode 704",
    category: ["二分查找"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, target;
    cin >> n >> target;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    int l = 0, r = n - 1;
    while (l <= r) {
        int mid = l + (r - l) / 2;
        if (a[mid] == target) { cout << mid << endl; return 0; }
        else if (a[mid] < target) l = mid + 1;
        else r = mid - 1;
    }
    cout << -1 << endl;
    return 0;
}`,
  },
  {
    title: "合并两个有序数组",
    statement: "给定两个升序排列的整数数组，合并成一个升序数组。\n输入：第一行 n，第二行 n 个整数，第三行 m，第四行 m 个整数。输出：合并后的升序数组。",
    source: "LeetCode 88",
    category: ["双指针", "数组"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, m;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    cin >> m;
    vector<int> b(m);
    for (int i = 0; i < m; i++) cin >> b[i];
    vector<int> res;
    int i = 0, j = 0;
    while (i < n && j < m) {
        if (a[i] <= b[j]) res.push_back(a[i++]);
        else res.push_back(b[j++]);
    }
    while (i < n) res.push_back(a[i++]);
    while (j < m) res.push_back(b[j++]);
    for (int x : res) cout << x << " ";
    cout << endl;
    return 0;
}`,
  },
  {
    title: "斐波那契数列",
    statement: "求斐波那契数列第 n 项（从 0 开始，F(0)=0，F(1)=1）。\n输入：n。输出：F(n)。",
    source: "LeetCode 509",
    category: ["动态规划", "递推"],
    difficulty: "简单",
    code: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    if (n == 0) { cout << 0 << endl; return 0; }
    long long a = 0, b = 1;
    for (int i = 2; i <= n; i++) {
        long long c = a + b;
        a = b; b = c;
    }
    cout << b << endl;
    return 0;
}`,
  },
  {
    title: "最大子数组和",
    statement: "给定一个整数数组，找出具有最大和的连续子数组，返回其最大和。\n输入：第一行 n，第二行 n 个整数。输出：最大子数组和。",
    source: "LeetCode 53",
    category: ["动态规划", "前缀和"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    long long cur = a[0], ans = a[0];
    for (int i = 1; i < n; i++) {
        cur = max((long long)a[i], cur + a[i]);
        ans = max(ans, cur);
    }
    cout << ans << endl;
    return 0;
}`,
  },
  {
    title: "反转字符串",
    statement: "编写一个函数将输入的字符串原地反转。\n输入：一个字符串。输出：反转后的字符串。",
    source: "LeetCode 344",
    category: ["双指针", "字符串"],
    difficulty: "简单",
    code: `#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    string s;
    cin >> s;
    reverse(s.begin(), s.end());
    cout << s << endl;
    return 0;
}`,
  },
  {
    title: "回文数",
    statement: "判断一个整数是否是回文数（正序和倒序读都一样）。\n输入：一个整数 x。输出：true 或 false。",
    source: "LeetCode 9",
    category: ["数学"],
    difficulty: "简单",
    code: `#include <iostream>
using namespace std;

int main() {
    int x;
    cin >> x;
    if (x < 0) { cout << "false" << endl; return 0; }
    long long rev = 0, tmp = x;
    while (tmp > 0) {
        rev = rev * 10 + tmp % 10;
        tmp /= 10;
    }
    cout << (rev == x ? "true" : "false") << endl;
    return 0;
}`,
  },
  {
    title: "整数反转",
    statement: "给定一个 32 位有符号整数，将其数字部分反转。若反转后溢出 32 位范围则输出 0。\n输入：一个整数 x。输出：反转后的整数或 0。",
    source: "LeetCode 7",
    category: ["数学"],
    difficulty: "简单",
    code: `#include <iostream>
#include <climits>
using namespace std;

int main() {
    long long x;
    cin >> x;
    long long rev = 0;
    int sign = x < 0 ? -1 : 1;
    x = x < 0 ? -x : x;
    while (x > 0) {
        rev = rev * 10 + x % 10;
        x /= 10;
    }
    rev *= sign;
    if (rev > INT_MAX || rev < INT_MIN) cout << 0 << endl;
    else cout << rev << endl;
    return 0;
}`,
  },
  {
    title: "罗马数字转整数",
    statement: "给定一个罗马数字字符串，将其转换成整数。罗马数字包含 I(1) V(5) X(10) L(50) C(100) D(500) M(1000)。\n输入：一个罗马数字字符串。输出：对应整数。",
    source: "LeetCode 13",
    category: ["哈希表", "字符串"],
    difficulty: "简单",
    code: `#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;

int main() {
    string s;
    cin >> s;
    unordered_map<char, int> mp = {{'I',1},{'V',5},{'X',10},{'L',50},{'C',100},{'D',500},{'M',1000}};
    int ans = 0;
    for (int i = 0; i < (int)s.size(); i++) {
        if (i + 1 < (int)s.size() && mp[s[i]] < mp[s[i+1]]) ans -= mp[s[i]];
        else ans += mp[s[i]];
    }
    cout << ans << endl;
    return 0;
}`,
  },
  {
    title: "最长公共前缀",
    statement: "给定 n 个字符串，找出它们的最长公共前缀；若不存在则输出空行。\n输入：第一行 n，接下来 n 行每行一个字符串。输出：最长公共前缀。",
    source: "LeetCode 14",
    category: ["字符串"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<string> s(n);
    for (int i = 0; i < n; i++) cin >> s[i];
    if (n == 0) return 0;
    string ans = s[0];
    for (int i = 1; i < n; i++) {
        int j = 0;
        while (j < (int)ans.size() && j < (int)s[i].size() && ans[j] == s[i][j]) j++;
        ans = ans.substr(0, j);
    }
    cout << ans << endl;
    return 0;
}`,
  },
  {
    title: "删除有序数组中的重复项",
    statement: "给定一个升序排列的数组，原地删除重复元素，返回新数组长度。\n输入：第一行 n，第二行 n 个升序整数。输出：去重后的长度和去重后的元素。",
    source: "LeetCode 26",
    category: ["双指针", "数组"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    int k = 0;
    for (int i = 0; i < n; i++) {
        if (k == 0 || a[i] != a[k-1]) a[k++] = a[i];
    }
    cout << k << endl;
    for (int i = 0; i < k; i++) cout << a[i] << " ";
    cout << endl;
    return 0;
}`,
  },
  {
    title: "移除元素",
    statement: "给定一个数组和一个值 val，原地移除所有等于 val 的元素，返回新长度。\n输入：第一行 n val，第二行 n 个整数。输出：新长度和新数组。",
    source: "LeetCode 27",
    category: ["双指针", "数组"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, val;
    cin >> n >> val;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    int k = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] != val) a[k++] = a[i];
    }
    cout << k << endl;
    for (int i = 0; i < k; i++) cout << a[i] << " ";
    cout << endl;
    return 0;
}`,
  },
  {
    title: "搜索插入位置",
    statement: "给定一个升序数组和一个目标值，返回目标值应插入的位置（若存在则返回下标）。\n输入：第一行 n target，第二行 n 个升序整数。输出：插入位置下标。",
    source: "LeetCode 35",
    category: ["二分查找"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, target;
    cin >> n >> target;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    int l = 0, r = n;
    while (l < r) {
        int mid = l + (r - l) / 2;
        if (a[mid] < target) l = mid + 1;
        else r = mid;
    }
    cout << l << endl;
    return 0;
}`,
  },
  {
    title: "加一",
    statement: "给定一个非负整数数组表示一个整数（最高位在前），对该整数加一。\n输入：第一行 n，第二行 n 个数字（每位 0-9）。输出：加一后的数字数组。",
    source: "LeetCode 66",
    category: ["数组", "数学"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    for (int i = n - 1; i >= 0; i--) {
        if (a[i] < 9) { a[i]++; for (int x : a) cout << x << " "; cout << endl; return 0; }
        a[i] = 0;
    }
    cout << 1 << " ";
    for (int x : a) cout << x << " ";
    cout << endl;
    return 0;
}`,
  },
  {
    title: "x 的平方根",
    statement: "计算并返回非负整数 x 的平方根（向下取整）。\n输入：x。输出：sqrt(x) 向下取整。",
    source: "LeetCode 69",
    category: ["二分查找", "数学"],
    difficulty: "简单",
    code: `#include <iostream>
using namespace std;

int main() {
    long long x;
    cin >> x;
    long long l = 0, r = x, ans = 0;
    while (l <= r) {
        long long mid = l + (r - l) / 2;
        if (mid * mid <= x) { ans = mid; l = mid + 1; }
        else r = mid - 1;
    }
    cout << ans << endl;
    return 0;
}`,
  },
  {
    title: "爬楼梯",
    statement: "假设你正在爬楼梯，需要 n 阶才能到达楼顶。每次可以爬 1 或 2 阶，求有多少种不同的方法爬到楼顶。\n输入：n。输出：方法数。",
    source: "LeetCode 70",
    category: ["动态规划", "递推"],
    difficulty: "简单",
    code: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    if (n <= 2) { cout << n << endl; return 0; }
    long long a = 1, b = 2;
    for (int i = 3; i <= n; i++) {
        long long c = a + b;
        a = b; b = c;
    }
    cout << b << endl;
    return 0;
}`,
  },
  {
    title: "买卖股票的最佳时机",
    statement: "给定一个数组，第 i 个元素是第 i 天股票的价格。你只能选择某一天买入并在之后的某一天卖出，求最大利润；若不能获利则输出 0。\n输入：第一行 n，第二行 n 个价格。输出：最大利润。",
    source: "LeetCode 121",
    category: ["动态规划", "贪心"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    int minp = a[0], ans = 0;
    for (int i = 1; i < n; i++) {
        ans = max(ans, a[i] - minp);
        minp = min(minp, a[i]);
    }
    cout << ans << endl;
    return 0;
}`,
  },
  {
    title: "杨辉三角",
    statement: "给定一个非负整数 numRows，生成杨辉三角的前 numRows 行。\n输入：numRows。输出：每行数字。",
    source: "LeetCode 118",
    category: ["数组", "动态规划"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<vector<long long>> tri;
    for (int i = 0; i < n; i++) {
        vector<long long> row(i + 1, 1);
        for (int j = 1; j < i; j++) row[j] = tri[i-1][j-1] + tri[i-1][j];
        tri.push_back(row);
        for (long long x : row) cout << x << " ";
        cout << endl;
    }
    return 0;
}`,
  },
  {
    title: "只出现一次的数字",
    statement: "给定一个非空整数数组，除了某个元素只出现一次外，其余每个元素均出现两次。找出那个只出现一次的元素。\n输入：第一行 n，第二行 n 个整数。输出：只出现一次的数字。",
    source: "LeetCode 136",
    category: ["位运算"],
    difficulty: "简单",
    code: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int ans = 0;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        ans ^= x;
    }
    cout << ans << endl;
    return 0;
}`,
  },
  {
    title: "多数元素",
    statement: "给定一个大小为 n 的数组，找出其中出现次数大于 n/2 的多数元素（保证存在）。\n输入：第一行 n，第二行 n 个整数。输出：多数元素。",
    source: "LeetCode 169",
    category: ["摩尔投票", "数组"],
    difficulty: "简单",
    code: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int cand, cnt = 0;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        if (cnt == 0) { cand = x; cnt = 1; }
        else if (x == cand) cnt++;
        else cnt--;
    }
    cout << cand << endl;
    return 0;
}`,
  },
  {
    title: "存在重复元素",
    statement: "给定一个整数数组，判断是否存在重复元素。\n输入：第一行 n，第二行 n 个整数。输出：true 或 false。",
    source: "LeetCode 217",
    category: ["哈希表", "排序"],
    difficulty: "简单",
    code: `#include <iostream>
#include <unordered_set>
using namespace std;

int main() {
    int n;
    cin >> n;
    unordered_set<int> st;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        if (st.count(x)) { cout << "true" << endl; return 0; }
        st.insert(x);
    }
    cout << "false" << endl;
    return 0;
}`,
  },
  {
    title: "移动零",
    statement: "给定一个数组，将所有 0 移动到数组末尾，同时保持非零元素的相对顺序。\n输入：第一行 n，第二行 n 个整数。输出：移动后的数组。",
    source: "LeetCode 283",
    category: ["双指针", "数组"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    int k = 0;
    for (int i = 0; i < n; i++) if (a[i] != 0) a[k++] = a[i];
    while (k < n) a[k++] = 0;
    for (int x : a) cout << x << " ";
    cout << endl;
    return 0;
}`,
  },
  {
    title: "两个数组的交集",
    statement: "给定两个数组，计算它们的交集（每个元素在结果中只出现一次）。\n输入：第一行 n，第二行 n 个整数，第三行 m，第四行 m 个整数。输出：交集元素。",
    source: "LeetCode 349",
    category: ["哈希表", "集合"],
    difficulty: "简单",
    code: `#include <iostream>
#include <unordered_set>
#include <vector>
using namespace std;

int main() {
    int n, m;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    cin >> m;
    vector<int> b(m);
    for (int i = 0; i < m; i++) cin >> b[i];
    unordered_set<int> sa(a.begin(), a.end());
    unordered_set<int> res;
    for (int x : b) if (sa.count(x)) res.insert(x);
    for (int x : res) cout << x << " ";
    cout << endl;
    return 0;
}`,
  },
  {
    title: "字符串中的第一个唯一字符",
    statement: "给定一个字符串，找到第一个不重复的字符并返回其下标；若不存在则返回 -1。\n输入：一个字符串。输出：下标或 -1。",
    source: "LeetCode 387",
    category: ["哈希表", "字符串"],
    difficulty: "简单",
    code: `#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;

int main() {
    string s;
    cin >> s;
    unordered_map<char, int> cnt;
    for (char c : s) cnt[c]++;
    for (int i = 0; i < (int)s.size(); i++) {
        if (cnt[s[i]] == 1) { cout << i << endl; return 0; }
    }
    cout << -1 << endl;
    return 0;
}`,
  },
  {
    title: "有效的字母异位词",
    statement: "给定两个字符串 s 和 t，判断 t 是否是 s 的字母异位词（字母相同、顺序不同）。\n输入：两个字符串 s t。输出：true 或 false。",
    source: "LeetCode 242",
    category: ["哈希表", "字符串"],
    difficulty: "简单",
    code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s, t;
    cin >> s >> t;
    int cnt[26] = {0};
    for (char c : s) cnt[c - 'a']++;
    for (char c : t) cnt[c - 'a']--;
    for (int i = 0; i < 26; i++) if (cnt[i] != 0) { cout << "false" << endl; return 0; }
    cout << "true" << endl;
    return 0;
}`,
  },
  {
    title: "缺失数字",
    statement: "给定一个包含 0 到 n 中 n 个数的数组，找出缺失的那个数。\n输入：第一行 n（数组长度），第二行 n 个整数（0 到 n 之间，缺一个）。输出：缺失的数字。",
    source: "LeetCode 268",
    category: ["位运算", "数学"],
    difficulty: "简单",
    code: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int ans = 0;
    for (int i = 0; i <= n; i++) ans ^= i;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        ans ^= x;
    }
    cout << ans << endl;
    return 0;
}`,
  },
  {
    title: "判断质数",
    statement: "判断一个整数 n 是否为质数。\n输入：n。输出：true 或 false。",
    source: "经典",
    category: ["数学", "数论"],
    difficulty: "简单",
    code: `#include <iostream>
using namespace std;

bool isPrime(int n) {
    if (n < 2) return false;
    for (int i = 2; (long long)i * i <= n; i++)
        if (n % i == 0) return false;
    return true;
}

int main() {
    int n;
    cin >> n;
    cout << (isPrime(n) ? "true" : "false") << endl;
    return 0;
}`,
  },
  {
    title: "阶乘后的零",
    statement: "给定一个整数 n，返回 n! 结果末尾零的数量。\n输入：n。输出：末尾零的个数。",
    source: "LeetCode 172",
    category: ["数学"],
    difficulty: "简单",
    code: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int ans = 0;
    while (n >= 5) {
        n /= 5;
        ans += n;
    }
    cout << ans << endl;
    return 0;
}`,
  },
];

export const competitionProblems: BuiltinProblem[] = [
  {
    title: "最长上升子序列",
    statement: "给定一个整数数组，求其中严格递增的最长子序列的长度。\n输入：第一行 n，第二行 n 个整数。输出：最长上升子序列长度。",
    source: "LeetCode 300",
    category: ["动态规划", "二分"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    vector<int> tails;
    for (int x : a) {
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    cout << tails.size() << endl;
    return 0;
}`,
  },
  {
    title: "最长公共子序列",
    statement: "给定两个字符串，求它们最长公共子序列的长度。\n输入：两个字符串 s1 s2。输出：最长公共子序列长度。",
    source: "LeetCode 1143",
    category: ["动态规划"],
    difficulty: "中等",
    code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string a, b;
    cin >> a >> b;
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++)
            dp[i][j] = a[i-1] == b[j-1] ? dp[i-1][j-1] + 1 : max(dp[i-1][j], dp[i][j-1]);
    cout << dp[n][m] << endl;
    return 0;
}`,
  },
  {
    title: "编辑距离",
    statement: "给定两个单词，求将 word1 转换成 word2 所需的最少操作数（插入、删除、替换）。\n输入：两个字符串 w1 w2。输出：最少操作数。",
    source: "LeetCode 72",
    category: ["动态规划"],
    difficulty: "困难",
    code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string a, b;
    cin >> a >> b;
    int n = a.size(), m = b.size();
    vector<vector<int>> dp(n + 1, vector<int>(m + 1));
    for (int i = 0; i <= n; i++) dp[i][0] = i;
    for (int j = 0; j <= m; j++) dp[0][j] = j;
    for (int i = 1; i <= n; i++)
        for (int j = 1; j <= m; j++) {
            if (a[i-1] == b[j-1]) dp[i][j] = dp[i-1][j-1];
            else dp[i][j] = 1 + min(dp[i-1][j-1], min(dp[i-1][j], dp[i][j-1]));
        }
    cout << dp[n][m] << endl;
    return 0;
}`,
  },
  {
    title: "0-1 背包",
    statement: "有 N 件物品和一个容量为 V 的背包，每件物品有重量 w 和价值 v，每件物品只能选一次。求能装入背包的最大价值。\n输入：第一行 N V，接下来 N 行每行 w v。输出：最大价值。",
    source: "经典 DP",
    category: ["动态规划", "背包"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int N, V;
    cin >> N >> V;
    vector<int> w(N), v(N);
    for (int i = 0; i < N; i++) cin >> w[i] >> v[i];
    vector<int> dp(V + 1, 0);
    for (int i = 0; i < N; i++)
        for (int j = V; j >= w[i]; j--)
            dp[j] = max(dp[j], dp[j - w[i]] + v[i]);
    cout << dp[V] << endl;
    return 0;
}`,
  },
  {
    title: "完全背包",
    statement: "有 N 种物品和一个容量为 V 的背包，每种物品有重量 w 和价值 v，每种物品可选无限次。求最大价值。\n输入：第一行 N V，接下来 N 行每行 w v。输出：最大价值。",
    source: "经典 DP",
    category: ["动态规划", "背包"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int N, V;
    cin >> N >> V;
    vector<int> w(N), v(N);
    for (int i = 0; i < N; i++) cin >> w[i] >> v[i];
    vector<int> dp(V + 1, 0);
    for (int i = 0; i < N; i++)
        for (int j = w[i]; j <= V; j++)
            dp[j] = max(dp[j], dp[j - w[i]] + v[i]);
    cout << dp[V] << endl;
    return 0;
}`,
  },
  {
    title: "最小路径和",
    statement: "给定一个 m x n 的网格，每个格子有非负数字，从左上角走到右下角，每次只能向右或向下，求路径上数字和最小的路径。\n输入：第一行 m n，接下来 m 行每行 n 个数。输出：最小路径和。",
    source: "LeetCode 64",
    category: ["动态规划", "网格"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int m, n;
    cin >> m >> n;
    vector<vector<int>> g(m, vector<int>(n));
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++) cin >> g[i][j];
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++) {
            if (i == 0 && j == 0) continue;
            int up = i > 0 ? g[i-1][j] : 1e9;
            int left = j > 0 ? g[i][j-1] : 1e9;
            g[i][j] += min(up, left);
        }
    cout << g[m-1][n-1] << endl;
    return 0;
}`,
  },
  {
    title: "不同路径",
    statement: "一个机器人位于 m x n 网格左上角，每次只能向右或向下移动，求到达右下角的不同路径数。\n输入：m n。输出：路径总数。",
    source: "LeetCode 62",
    category: ["动态规划", "组合数学"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int m, n;
    cin >> m >> n;
    vector<vector<long long>> dp(m, vector<long long>(n, 1));
    for (int i = 1; i < m; i++)
        for (int j = 1; j < n; j++)
            dp[i][j] = dp[i-1][j] + dp[i][j-1];
    cout << dp[m-1][n-1] << endl;
    return 0;
}`,
  },
  {
    title: "跳跃游戏",
    statement: "给定一个非负整数数组，每个元素表示该位置能跳跃的最大长度，判断能否从下标 0 到达最后一个下标。\n输入：第一行 n，第二行 n 个整数。输出：true 或 false。",
    source: "LeetCode 55",
    category: ["贪心"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    int far = 0;
    for (int i = 0; i < n; i++) {
        if (i > far) { cout << "false" << endl; return 0; }
        far = max(far, i + a[i]);
        if (far >= n - 1) { cout << "true" << endl; return 0; }
    }
    cout << "true" << endl;
    return 0;
}`,
  },
  {
    title: "合并区间",
    statement: "给定若干区间 [l, r]，合并所有重叠的区间。\n输入：第一行 n，接下来 n 行每行 l r。输出：合并后的区间（每行 l r）。",
    source: "LeetCode 56",
    category: ["排序", "区间"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<pair<int, int>> a(n);
    for (int i = 0; i < n; i++) cin >> a[i].first >> a[i].second;
    sort(a.begin(), a.end());
    vector<pair<int, int>> res;
    for (auto p : a) {
        if (res.empty() || p.first > res.back().second) res.push_back(p);
        else res.back().second = max(res.back().second, p.second);
    }
    for (auto p : res) cout << p.first << " " << p.second << endl;
    return 0;
}`,
  },
  {
    title: "三数之和",
    statement: "给定一个整数数组，找出所有和为 0 且不重复的三元组。\n输入：第一行 n，第二行 n 个整数。输出：每个三元组一行（三个数空格分隔，升序）。",
    source: "LeetCode 15",
    category: ["双指针", "排序"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    sort(a.begin(), a.end());
    for (int i = 0; i < n; i++) {
        if (i > 0 && a[i] == a[i-1]) continue;
        int l = i + 1, r = n - 1;
        while (l < r) {
            int sum = a[i] + a[l] + a[r];
            if (sum == 0) {
                cout << a[i] << " " << a[l] << " " << a[r] << endl;
                while (l < r && a[l] == a[l+1]) l++;
                while (l < r && a[r] == a[r-1]) r--;
                l++; r--;
            } else if (sum < 0) l++;
            else r--;
        }
    }
    return 0;
}`,
  },
  {
    title: "盛最多水的容器",
    statement: "给定一个数组表示容器高度，找出两条线，使其与 x 轴围成的容器能容纳最多的水。\n输入：第一行 n，第二行 n 个高度。输出：最大容量。",
    source: "LeetCode 11",
    category: ["双指针", "贪心"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> h(n);
    for (int i = 0; i < n; i++) cin >> h[i];
    int l = 0, r = n - 1, ans = 0;
    while (l < r) {
        ans = max(ans, min(h[l], h[r]) * (r - l));
        if (h[l] < h[r]) l++;
        else r--;
    }
    cout << ans << endl;
    return 0;
}`,
  },
  {
    title: "接雨水",
    statement: "给定 n 个非负整数表示每个宽度为 1 的柱子的高度，计算下雨后能接多少雨水。\n输入：第一行 n，第二行 n 个高度。输出：接雨水量。",
    source: "LeetCode 42",
    category: ["双指针", "单调栈"],
    difficulty: "困难",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> h(n);
    for (int i = 0; i < n; i++) cin >> h[i];
    int l = 0, r = n - 1, lm = 0, rm = 0, ans = 0;
    while (l < r) {
        if (h[l] < h[r]) {
            if (h[l] >= lm) lm = h[l];
            else ans += lm - h[l];
            l++;
        } else {
            if (h[r] >= rm) rm = h[r];
            else ans += rm - h[r];
            r--;
        }
    }
    cout << ans << endl;
    return 0;
}`,
  },
  {
    title: "滑动窗口最大值",
    statement: "给定一个数组和一个窗口大小 k，求每个滑动窗口内的最大值。\n输入：第一行 n k，第二行 n 个整数。输出：每个窗口的最大值（空格分隔）。",
    source: "LeetCode 239",
    category: ["单调队列", "滑动窗口"],
    difficulty: "困难",
    code: `#include <iostream>
#include <vector>
#include <deque>
using namespace std;

int main() {
    int n, k;
    cin >> n >> k;
    vector<int> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];
    deque<int> dq;
    vector<int> res;
    for (int i = 0; i < n; i++) {
        while (!dq.empty() && dq.front() <= i - k) dq.pop_front();
        while (!dq.empty() && a[dq.back()] <= a[i]) dq.pop_back();
        dq.push_back(i);
        if (i >= k - 1) res.push_back(a[dq.front()]);
    }
    for (int x : res) cout << x << " ";
    cout << endl;
    return 0;
}`,
  },
  {
    title: "字符串相乘",
    statement: "给定两个以字符串形式表示的非负整数，返回它们的乘积（字符串形式）。\n输入：两个字符串 num1 num2。输出：乘积字符串。",
    source: "LeetCode 43",
    category: ["数学", "字符串"],
    difficulty: "中等",
    code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string a, b;
    cin >> a >> b;
    if (a == "0" || b == "0") { cout << 0 << endl; return 0; }
    int n = a.size(), m = b.size();
    vector<int> res(n + m, 0);
    for (int i = n - 1; i >= 0; i--)
        for (int j = m - 1; j >= 0; j--) {
            int mul = (a[i] - '0') * (b[j] - '0');
            int p1 = i + j, p2 = i + j + 1;
            int sum = mul + res[p2];
            res[p2] = sum % 10;
            res[p1] += sum / 10;
        }
    string ans;
    int i = 0;
    while (i < (int)res.size() && res[i] == 0) i++;
    for (; i < (int)res.size(); i++) ans += char(res[i] + '0');
    cout << ans << endl;
    return 0;
}`,
  },
  {
    title: "二叉树的中序遍历",
    statement: "给定一棵二叉树，返回其中序遍历（迭代实现）。\n输入：第一行 n，第二行 n 个节点值（-1 表示空节点，层序输入）。输出：中序遍历结果。",
    source: "LeetCode 94",
    category: ["二叉树", "栈"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
#include <stack>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

int main() {
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++) cin >> v[i];
    if (n == 0 || v[0] == -1) return 0;
    vector<TreeNode*> nodes(n, nullptr);
    nodes[0] = new TreeNode(v[0]);
    for (int i = 0; i < n; i++) {
        if (nodes[i] == nullptr) continue;
        int l = 2 * i + 1, r = 2 * i + 2;
        if (l < n && v[l] != -1) nodes[l] = new TreeNode(v[l]);
        if (r < n && v[r] != -1) nodes[r] = new TreeNode(v[r]);
        nodes[i]->left = (l < n && v[l] != -1) ? nodes[l] : nullptr;
        nodes[i]->right = (r < n && v[r] != -1) ? nodes[r] : nullptr;
    }
    vector<int> res;
    stack<TreeNode*> st;
    TreeNode* cur = nodes[0];
    while (cur || !st.empty()) {
        while (cur) { st.push(cur); cur = cur->left; }
        cur = st.top(); st.pop();
        res.push_back(cur->val);
        cur = cur->right;
    }
    for (int x : res) cout << x << " ";
    cout << endl;
    return 0;
}`,
  },
  {
    title: "二叉树的最大深度",
    statement: "给定一棵二叉树，求其最大深度。\n输入：第一行 n，第二行 n 个节点值（-1 表示空节点，层序输入）。输出：最大深度。",
    source: "LeetCode 104",
    category: ["二叉树", "递归"],
    difficulty: "简单",
    code: `#include <iostream>
#include <vector>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

int dfs(TreeNode* node) {
    if (!node) return 0;
    return 1 + max(dfs(node->left), dfs(node->right));
}

int main() {
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++) cin >> v[i];
    if (n == 0 || v[0] == -1) { cout << 0 << endl; return 0; }
    vector<TreeNode*> nodes(n, nullptr);
    nodes[0] = new TreeNode(v[0]);
    for (int i = 0; i < n; i++) {
        if (!nodes[i]) continue;
        int l = 2 * i + 1, r = 2 * i + 2;
        if (l < n && v[l] != -1) nodes[l] = new TreeNode(v[l]);
        if (r < n && v[r] != -1) nodes[r] = new TreeNode(v[r]);
        nodes[i]->left = (l < n && v[l] != -1) ? nodes[l] : nullptr;
        nodes[i]->right = (r < n && v[r] != -1) ? nodes[r] : nullptr;
    }
    cout << dfs(nodes[0]) << endl;
    return 0;
}`,
  },
  {
    title: "二叉树的层序遍历",
    statement: "给定一棵二叉树，返回其层序遍历（从上到下，从左到右）。\n输入：第一行 n，第二行 n 个节点值（-1 表示空节点，层序输入）。输出：每层节点值。",
    source: "LeetCode 102",
    category: ["二叉树", "BFS"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
#include <queue>
using namespace std;

struct TreeNode {
    int val;
    TreeNode *left, *right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};

int main() {
    int n;
    cin >> n;
    vector<int> v(n);
    for (int i = 0; i < n; i++) cin >> v[i];
    if (n == 0 || v[0] == -1) return 0;
    vector<TreeNode*> nodes(n, nullptr);
    nodes[0] = new TreeNode(v[0]);
    for (int i = 0; i < n; i++) {
        if (!nodes[i]) continue;
        int l = 2 * i + 1, r = 2 * i + 2;
        if (l < n && v[l] != -1) nodes[l] = new TreeNode(v[l]);
        if (r < n && v[r] != -1) nodes[r] = new TreeNode(v[r]);
        nodes[i]->left = (l < n && v[l] != -1) ? nodes[l] : nullptr;
        nodes[i]->right = (r < n && v[r] != -1) ? nodes[r] : nullptr;
    }
    queue<TreeNode*> q;
    q.push(nodes[0]);
    while (!q.empty()) {
        int sz = q.size();
        for (int i = 0; i < sz; i++) {
            TreeNode* t = q.front(); q.pop();
            cout << t->val << " ";
            if (t->left) q.push(t->left);
            if (t->right) q.push(t->right);
        }
        cout << endl;
    }
    return 0;
}`,
  },
  {
    title: "验证二叉搜索树",
    statement: "给定一棵二叉树，判断它是否是有效的二叉搜索树（左子树 < 根 < 右子树）。\n输入：第一行 n，第二行 n 个节点值（-1 表示空节点，层序输入）。输出：true 或 false。",
    source: "LeetCode 98",
    category: ["二叉树", "递归"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
#include <climits>
using namespace std;

struct TreeNode {
    long long val;
    TreeNode *left, *right;
    TreeNode(long long x) : val(x), left(nullptr), right(nullptr) {}
};

bool check(TreeNode* node, long long lo, long long hi) {
    if (!node) return true;
    if (node->val <= lo || node->val >= hi) return false;
    return check(node->left, lo, node->val) && check(node->right, node->val, hi);
}

int main() {
    int n;
    cin >> n;
    vector<long long> v(n);
    for (int i = 0; i < n; i++) cin >> v[i];
    if (n == 0 || v[0] == -1) { cout << "true" << endl; return 0; }
    vector<TreeNode*> nodes(n, nullptr);
    nodes[0] = new TreeNode(v[0]);
    for (int i = 0; i < n; i++) {
        if (!nodes[i]) continue;
        int l = 2 * i + 1, r = 2 * i + 2;
        if (l < n && v[l] != -1) nodes[l] = new TreeNode(v[l]);
        if (r < n && v[r] != -1) nodes[r] = new TreeNode(v[r]);
        nodes[i]->left = (l < n && v[l] != -1) ? nodes[l] : nullptr;
        nodes[i]->right = (r < n && v[r] != -1) ? nodes[r] : nullptr;
    }
    cout << (check(nodes[0], LLONG_MIN, LLONG_MAX) ? "true" : "false") << endl;
    return 0;
}`,
  },
  {
    title: "岛屿数量",
    statement: "给定一个由 '1'（陆地）和 '0'（水）组成的二维网格，求岛屿数量（相邻陆地连通算一个岛）。\n输入：第一行 m n，接下来 m 行每行 n 个字符（无空格）。输出：岛屿数量。",
    source: "LeetCode 200",
    category: ["DFS", "BFS", "图"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
#include <string>
using namespace std;

int m, n;
vector<string> g;
int dir[4][2] = {{1,0},{-1,0},{0,1},{0,-1}};

void dfs(int x, int y) {
    if (x < 0 || x >= m || y < 0 || y >= n || g[x][y] == '0') return;
    g[x][y] = '0';
    for (auto& d : dir) dfs(x + d[0], y + d[1]);
}

int main() {
    cin >> m >> n;
    g.resize(m);
    for (int i = 0; i < m; i++) cin >> g[i];
    int ans = 0;
    for (int i = 0; i < m; i++)
        for (int j = 0; j < n; j++)
            if (g[i][j] == '1') { ans++; dfs(i, j); }
    cout << ans << endl;
    return 0;
}`,
  },
  {
    title: "课程表（拓扑排序）",
    statement: "有 n 门课程，某些课程有先修要求。给定先修关系列表，判断能否完成所有课程（即是否存在环）。\n输入：第一行 n m（课程数、先修关系数），接下来 m 行每行 a b 表示修 a 前需先修 b。输出：true 或 false。",
    source: "LeetCode 207",
    category: ["拓扑排序", "图"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
#include <queue>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<vector<int>> adj(n);
    vector<int> indeg(n, 0);
    for (int i = 0; i < m; i++) {
        int a, b; cin >> a >> b;
        adj[b].push_back(a);
        indeg[a]++;
    }
    queue<int> q;
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.push(i);
    int cnt = 0;
    while (!q.empty()) {
        int u = q.front(); q.pop(); cnt++;
        for (int v : adj[u]) if (--indeg[v] == 0) q.push(v);
    }
    cout << (cnt == n ? "true" : "false") << endl;
    return 0;
}`,
  },
  {
    title: "Dijkstra 最短路径",
    statement: "给定一个带权无向图（n 个节点，m 条边），求从节点 1 到其他所有节点的最短距离。\n输入：第一行 n m，接下来 m 行每行 u v w（边 u-v 权重 w）。输出：从 1 到各节点的最短距离（空格分隔，不可达输出 -1）。",
    source: "经典图论",
    category: ["图论", "最短路", "优先队列"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
#include <queue>
using namespace std;

const int INF = 1e9;

int main() {
    int n, m;
    cin >> n >> m;
    vector<vector<pair<int, int>>> adj(n + 1);
    for (int i = 0; i < m; i++) {
        int u, v, w; cin >> u >> v >> w;
        adj[u].push_back({v, w});
        adj[v].push_back({u, w});
    }
    vector<int> dist(n + 1, INF);
    dist[1] = 0;
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<>> pq;
    pq.push({0, 1});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    for (int i = 1; i <= n; i++) cout << (dist[i] == INF ? -1 : dist[i]) << " ";
    cout << endl;
    return 0;
}`,
  },
  {
    title: "并查集",
    statement: "维护一个集合并支持合并与查询：初始有 n 个独立元素，进行 m 次操作（1 a b 合并 a b，2 a b 查询 a b 是否同集合）。\n输入：第一行 n m，接下来 m 行操作。输出：对每个查询操作输出 YES 或 NO。",
    source: "经典数据结构",
    category: ["并查集", "数据结构"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
using namespace std;

vector<int> parent, rnk;

int find(int x) {
    if (parent[x] != x) parent[x] = find(parent[x]);
    return parent[x];
}

void unite(int a, int b) {
    int ra = find(a), rb = find(b);
    if (ra == rb) return;
    if (rnk[ra] < rnk[rb]) swap(ra, rb);
    parent[rb] = ra;
    if (rnk[ra] == rnk[rb]) rnk[ra]++;
}

int main() {
    int n, m;
    cin >> n >> m;
    parent.resize(n + 1);
    rnk.assign(n + 1, 0);
    for (int i = 1; i <= n; i++) parent[i] = i;
    for (int i = 0; i < m; i++) {
        int op, a, b; cin >> op >> a >> b;
        if (op == 1) unite(a, b);
        else cout << (find(a) == find(b) ? "YES" : "NO") << endl;
    }
    return 0;
}`,
  },
  {
    title: "快速幂",
    statement: "计算 a 的 b 次方对 mod 取模的结果。\n输入：a b mod。输出：a^b mod mod。",
    source: "经典数学",
    category: ["数学", "快速幂", "数论"],
    difficulty: "中等",
    code: `#include <iostream>
using namespace std;

long long qpow(long long a, long long b, long long mod) {
    long long res = 1;
    a %= mod;
    while (b > 0) {
        if (b & 1) res = res * a % mod;
        a = a * a % mod;
        b >>= 1;
    }
    return res;
}

int main() {
    long long a, b, mod;
    cin >> a >> b >> mod;
    cout << qpow(a, b, mod) << endl;
    return 0;
}`,
  },
  {
    title: "KMP 字符串匹配",
    statement: "给定主串 s 和模式串 p，找出 p 在 s 中所有出现的起始下标（从 0 开始）。\n输入：两行，第一行 s，第二行 p。输出：所有匹配起始下标（空格分隔，无匹配则输出空行）。",
    source: "经典字符串",
    category: ["字符串", "KMP"],
    difficulty: "困难",
    code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    string s, p;
    cin >> s >> p;
    int n = s.size(), m = p.size();
    vector<int> next(m, 0);
    for (int i = 1, j = 0; i < m; i++) {
        while (j > 0 && p[i] != p[j]) j = next[j-1];
        if (p[i] == p[j]) j++;
        next[i] = j;
    }
    for (int i = 0, j = 0; i < n; i++) {
        while (j > 0 && s[i] != p[j]) j = next[j-1];
        if (s[i] == p[j]) j++;
        if (j == m) {
            cout << i - m + 1 << " ";
            j = next[j-1];
        }
    }
    cout << endl;
    return 0;
}`,
  },
  {
    title: "最长回文子串",
    statement: "给定一个字符串，找出其中最长的回文子串。\n输入：一个字符串。输出：最长回文子串。",
    source: "LeetCode 5",
    category: ["字符串", "中心扩展", "双指针"],
    difficulty: "中等",
    code: `#include <iostream>
#include <string>
using namespace std;

string expand(string& s, int l, int r) {
    while (l >= 0 && r < (int)s.size() && s[l] == s[r]) { l--; r++; }
    return s.substr(l + 1, r - l - 1);
}

int main() {
    string s;
    cin >> s;
    if (s.empty()) return 0;
    string ans = "";
    for (int i = 0; i < (int)s.size(); i++) {
        string odd = expand(s, i, i);
        string even = expand(s, i, i + 1);
        if (odd.size() > ans.size()) ans = odd;
        if (even.size() > ans.size()) ans = even;
    }
    cout << ans << endl;
    return 0;
}`,
  },
  {
    title: "下一个更大元素",
    statement: "给定一个数组，对于每个元素，找出它右边第一个比它大的元素，不存在则输出 -1。\n输入：第一行 n，第二行 n 个整数。输出：每个元素的下一个更大元素（空格分隔）。",
    source: "LeetCode 496",
    category: ["单调栈"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
#include <stack>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> a(n), res(n, -1);
    for (int i = 0; i < n; i++) cin >> a[i];
    stack<int> st;
    for (int i = 0; i < n; i++) {
        while (!st.empty() && a[st.top()] < a[i]) {
            res[st.top()] = a[i];
            st.pop();
        }
        st.push(i);
    }
    for (int x : res) cout << x << " ";
    cout << endl;
    return 0;
}`,
  },
  {
    title: "差分数组（区间加）",
    statement: "有一个初始全为 0 的数组，进行 m 次区间加法操作（l r x 表示 [l,r] 区间每个数加 x），求最终数组。\n输入：第一行 n m，接下来 m 行每行 l r x。输出：最终数组。",
    source: "经典前缀和",
    category: ["前缀和", "差分"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<long long> diff(n + 2, 0);
    for (int i = 0; i < m; i++) {
        int l, r; long long x;
        cin >> l >> r >> x;
        diff[l] += x;
        diff[r + 1] -= x;
    }
    long long cur = 0;
    for (int i = 1; i <= n; i++) {
        cur += diff[i];
        cout << cur << " ";
    }
    cout << endl;
    return 0;
}`,
  },
  {
    title: "线段树（区间最大值）",
    statement: "维护一个数组，支持两种操作：1 x v 将第 x 个数改为 v，2 l r 查询区间 [l,r] 的最大值。\n输入：第一行 n m，第二行 n 个数，接下来 m 行操作。输出：对每个查询输出最大值。",
    source: "经典数据结构",
    category: ["线段树", "数据结构"],
    difficulty: "困难",
    code: `#include <iostream>
#include <vector>
using namespace std;

const int N = 100005;
int tree[4 * N];
vector<int> a;

void build(int node, int l, int r) {
    if (l == r) { tree[node] = a[l]; return; }
    int mid = (l + r) / 2;
    build(2 * node, l, mid);
    build(2 * node + 1, mid + 1, r);
    tree[node] = max(tree[2 * node], tree[2 * node + 1]);
}

void update(int node, int l, int r, int idx, int val) {
    if (l == r) { tree[node] = val; return; }
    int mid = (l + r) / 2;
    if (idx <= mid) update(2 * node, l, mid, idx, val);
    else update(2 * node + 1, mid + 1, r, idx, val);
    tree[node] = max(tree[2 * node], tree[2 * node + 1]);
}

int query(int node, int l, int r, int ql, int qr) {
    if (ql > r || qr < l) return 0;
    if (ql <= l && r <= qr) return tree[node];
    int mid = (l + r) / 2;
    return max(query(2 * node, l, mid, ql, qr), query(2 * node + 1, mid + 1, r, ql, qr));
}

int main() {
    int n, m;
    cin >> n >> m;
    a.resize(n + 1);
    for (int i = 1; i <= n; i++) cin >> a[i];
    build(1, 1, n);
    for (int i = 0; i < m; i++) {
        int op; cin >> op;
        if (op == 1) {
            int x, v; cin >> x >> v;
            update(1, 1, n, x, v);
        } else {
            int l, r; cin >> l >> r;
            cout << query(1, 1, n, l, r) << endl;
        }
    }
    return 0;
}`,
  },
  {
    title: "树状数组（单点更新区间查询）",
    statement: "维护一个数组，支持单点修改和区间求和。\n输入：第一行 n m，第二行 n 个数，接下来 m 行操作（1 x v 单点加 v，2 l r 查询区间和）。输出：对每个查询输出区间和。",
    source: "经典数据结构",
    category: ["树状数组", "数据结构"],
    difficulty: "中等",
    code: `#include <iostream>
#include <vector>
using namespace std;

const int N = 100005;
long long tree[N];
int n;

void add(int idx, long long val) {
    for (; idx <= n; idx += idx & -idx) tree[idx] += val;
}

long long sum(int idx) {
    long long res = 0;
    for (; idx > 0; idx -= idx & -idx) res += tree[idx];
    return res;
}

int main() {
    int m;
    cin >> n >> m;
    for (int i = 1; i <= n; i++) {
        long long x; cin >> x;
        add(i, x);
    }
    for (int i = 0; i < m; i++) {
        int op; cin >> op;
        if (op == 1) {
            int x; long long v; cin >> x >> v;
            add(x, v);
        } else {
            int l, r; cin >> l >> r;
            cout << sum(r) - sum(l - 1) << endl;
        }
    }
    return 0;
}`,
  },
  {
    title: "Nim 游戏",
    statement: "你和朋友玩 Nim 游戏：有几堆石子，两人轮流从任意一堆中取走至少 1 颗，取走最后一颗的人获胜。你先手，判断你是否必胜。\n输入：第一行 n（堆数），第二行 n 个整数（每堆石子数）。输出：true（必胜）或 false。",
    source: "LeetCode 292",
    category: ["博弈", "数学"],
    difficulty: "简单",
    code: `#include <iostream>
using namespace std;

int main() {
    int n;
    cin >> n;
    int xo = 0;
    for (int i = 0; i < n; i++) {
        int x; cin >> x;
        xo ^= x;
    }
    cout << (xo != 0 ? "true" : "false") << endl;
    return 0;
}`,
  },
];

