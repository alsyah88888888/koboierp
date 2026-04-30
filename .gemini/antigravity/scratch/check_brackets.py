
import sys

def check_brackets(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    
    for l_idx, line in enumerate(lines):
        line_num = l_idx + 1
        for c_idx, char in enumerate(line):
            if char in '({[':
                stack.append((char, line_num, c_idx + 1))
            elif char in ')}]':
                if not stack:
                    print(f"L{line_num}:C{c_idx+1}: Extra closing bracket '{char}'")
                    continue
                top, l_pos, c_pos = stack.pop()
                if top != pairs[char]:
                    print(f"L{line_num}:C{c_idx+1}: Mismatched bracket '{char}', expected match for '{top}' from L{l_pos}:C{c_pos}")
    
    while stack:
        char, l_pos, c_pos = stack.pop()
        print(f"L{l_pos}:C{c_pos}: Unclosed bracket '{char}'")

if __name__ == "__main__":
    check_brackets(sys.argv[1])
