"""
Safe Expression Evaluator

This module provides a secure AST-based expression evaluator to replace eval().

Only allows safe operations: literals, variables, arithmetic, comparisons, and boolean operators.
Rejects all other operations for security.
"""

import ast
import operator


def safe_eval(expr: str, variables: dict) -> bool:
    """
    Safely evaluate a Python expression using AST parsing.
    
    Only allows:
    - Numeric literals
    - Variable names
    - Binary arithmetic operations (+, -, *, /, %)
    - Comparison operators (==, !=, >, >=, <, <=, is, is not)
    - Boolean operations (and, or)
    
    Rejects all other operations for security.
    
    Args:
        expr: The expression string to evaluate
        variables: Dictionary of variable names and values
        
    Returns:
        bool: The boolean result of the expression evaluation
        
    Raises:
        ValueError: If the expression contains unsafe or unsupported operations
    """
    if not expr or not expr.strip():
        return False
    
    expr = expr.strip()
    
    # Operator mapping for allowed operations
    OPS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Mod: operator.mod,
        ast.Eq: operator.eq,
        ast.NotEq: operator.ne,
        ast.Gt: operator.gt,
        ast.GtE: operator.ge,
        ast.Lt: operator.lt,
        ast.LtE: operator.le,
        ast.Is: lambda a, b: a is b,
        ast.IsNot: lambda a, b: a is not b,
        ast.And: lambda a, b: a and b,
        ast.Or: lambda a, b: a or b,
    }
    
    try:
        tree = ast.parse(expr, mode='eval')
    except SyntaxError as e:
        raise ValueError(f"Invalid expression syntax: {expr}") from e
    
    def _eval(node):
        # Expression wrapper
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        
        # Numeric literals (Python 3.8+)
        if isinstance(node, ast.Constant):
            return node.value
        
        # Numeric literals (older Python versions)
        if isinstance(node, ast.Num):
            return node.n
        
        # None constant
        if isinstance(node, ast.NameConstant):
            return node.value
        
        # Variable names
        if isinstance(node, ast.Name):
            if node.id in variables:
                return variables[node.id]
            raise ValueError(f"Unknown variable: {node.id}")
        
        # Binary operations (+, -, *, /, %)
        if isinstance(node, ast.BinOp):
            op_type = type(node.op)
            if op_type not in OPS:
                raise ValueError(f"Unsupported binary operator: {op_type.__name__} in expression: {expr}")
            op = OPS[op_type]
            return op(_eval(node.left), _eval(node.right))
        
        # Boolean operations (and, or)
        if isinstance(node, ast.BoolOp):
            op_type = type(node.op)
            if op_type not in OPS:
                raise ValueError(f"Unsupported boolean operator: {op_type.__name__} in expression: {expr}")
            op = OPS[op_type]
            if len(node.values) < 2:
                raise ValueError(f"Boolean operation requires at least 2 values in expression: {expr}")
            left = _eval(node.values[0])
            for value in node.values[1:]:
                left = op(left, _eval(value))
            return left
        
        # Comparisons (==, !=, >, >=, <, <=, is, is not, and chained comparisons)
        if isinstance(node, ast.Compare):
            if len(node.ops) != len(node.comparators):
                raise ValueError(f"Mismatched comparison operators and comparators in expression: {expr}")
            
            left = _eval(node.left)
            for op, comparator in zip(node.ops, node.comparators):
                op_type = type(op)
                if op_type not in OPS:
                    raise ValueError(f"Unsupported comparison operator: {op_type.__name__} in expression: {expr}")
                oper = OPS[op_type]
                right = _eval(comparator)
                if not oper(left, right):
                    return False
                left = right  # For chained comparisons like "12 <= x <= 18"
            return True
        
        # Reject all other node types
        raise ValueError(f"Unsupported or unsafe AST node type: {type(node).__name__} in expression: {expr}")
    
    try:
        result = _eval(tree.body)
        return bool(result)
    except ValueError:
        raise  # Re-raise our custom ValueError
    except Exception as e:
        raise ValueError(f"Error evaluating expression '{expr}': {str(e)}") from e

