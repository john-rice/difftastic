const
  digit = /[0-9]/,
  hexDigit = /[0-9a-fA-F]/,
  octalDigit = /[0-7]/,
  decimals = repeat1(digit),

  hexidecimal = seq(choice('x', 'X'), repeat1(hexDigit)),
  octadecimal = seq(choice('o', 'O'), repeat1(octalDigit)),

  decimalLiteral = seq(digit, repeat(digit)),
  hexLiteral     = seq('0', hexidecimal),
  octalLiteral   = seq('0', octadecimal),

  exponent = seq(
    choice('e', 'E'),
    optional(choice('+', '-')),
    repeat1(decimalLiteral)
  ),

  floatLiteral = choice(
    seq(decimals, '.', decimals, optional(exponent)),
    seq(decimals, exponent)
  ),

  variable_symbol = choice(
    '!',
    '#',
    '$',
    '%',
    '&',
    '⋆',
    '+',
    '.',
    '/',
    '<',
    '>',
    '?',
    '^',
    '-',
    '*',
    '=',
    '~'
  ),

  restricted_variable_symbol = ':',

  constructor_symbol = choice(
    '!',
    '#',
    '$',
    '%',
    '&',
    '⋆',
    '+',
    '.',
    '/',
    '<',
    '>',
    '?',
    '^',
    '-',
    '*',
    '=',
    ':'
  )

module.exports = grammar({
  name: 'haskell',

  inline: $ => [
    $._infix_expression
  ],

  extras: $ => [
    $.comment,
    /\s|\\n/
  ],

  externals: $ => [
    $._layout_semicolon,
    $._layout_open_brace,
    $._layout_close_brace,
    '->'
  ],

  conflicts: $ => [
    [$.type_constructor_identifier, $.type_class_identifier],
    [$.qualified_constructor_identifier, $.qualified_type_constructor_identifier],
    [$.qualified_type_constructor_identifier, $.qualified_type_class_identifier],
    [$.constructor_identifier, $.type_constructor_identifier],
    [$._constructor_identifier, $._module_identifier],
    [$.module_identifier, $.qualified_module_identifier],
    [$.constructor_identifier, $.type_constructor_identifier, $.type_class_identifier],
    [$.quasi_quotation, $.variable_identifier],
    [$.simple_class],
    [$.type_class_declaration, $.simple_class],
    [$._general_type_constructor, $.simple_class],

    [$.constructor_pattern, $._a_expression],
    [$._a_expression, $.labeled_construction],
    [$._lexp, $._a_expression],
    [$.labeled_pattern, $._a_expression, $.labeled_construction],

    [$._a_pattern, $._a_expression],

    [$._expression, $.expression_type_signature],

    [$._lexp, $.function_application],

    [$._general_type_constructor, $._simple_type]
  ],

  rules: {
    module: $ => choice(
      seq(
        repeat($.language_pragma),
        'module',
        $._qualified_module_identifier,
        optional(choice($.warning_pragma, $.deprecated_pragma)),
        optional($.module_exports),
        alias($._top_where, $.where)
      ),
      seq(
        repeat($.language_pragma),
        repeat(seq($._top_declaration, choice($._terminal, $._layout_semicolon)))
      )
    ),

    _top_declarations: $ => choice(
      seq(
        '{',
        repeat(seq($._top_declaration, optional($._terminal))),
        '}'
      ),
      seq(
        $._layout_open_brace,
        repeat(seq($._top_declaration, choice($._terminal, $._layout_semicolon))),
        $._layout_close_brace
      )
    ),

    _statements: $ => choice(
      seq(
        '{',
        repeat(seq($._statement, optional($._terminal))),
        '}'
      ),
      seq(
        $._layout_open_brace,
        repeat(
          seq(
            $._statement,
            choice($._terminal, $._layout_semicolon)
          )
        ),
        $._layout_close_brace
      )
    ),

    _declarations: $ => choice(
      seq(
        '{',
        repeat(seq($._declaration, optional($._terminal))),
        '}'
      ),
      seq(
        $._layout_open_brace,
        repeat(
            seq(
              $._declaration,
              choice($._terminal, $._layout_semicolon
            )
          )
        ),
        $._layout_close_brace
      )
    ),

    module_exports: $ => seq(
      '(',
      optional(sep1(',', $.export)),
      ')'
    ),

    export: $ => seq(
      optional(alias('type', $.type)),
      choice(
        choice($._qualified_variable, $._variable),
        $.module_export,
        seq(
          choice($.qualified_type_constructor_identifier, $.type_constructor_identifier),
          optional(choice(
            optional($.all_constructors),
            seq(
              '(',
              optional(sep1(',', choice($._variable, $._constructor))),
              ')'
            )
          ))
        ),
        seq(
          choice($.qualified_type_class_identifier, $.type_class_identifier),
          optional(choice(
            $.all_constructors,
            seq(
              '(',
              optional(sep1(',', choice($._qualified_variable, $._variable))),
              ')'
            )
          ))
        )
      )
    ),

    module_export: $ => seq(
      'module',
      $._qualified_module_identifier
    ),

    all_constructors: $ => '(..)',

    qualified_import_declaration: $ => seq(
      'import',
      'qualified',
      $._import_declaration
    ),

    import_declaration: $ => seq(
      'import',
      optional($.source_pragma),
      $._import_declaration
    ),

    _import_declaration: $ => prec.right(seq(
      choice(
        $.import_alias,
        $._qualified_module_identifier
      ),
      optional(choice($.import_spec, $.hidden_import_spec))
    )),

    import_alias: $ => seq(
      $._qualified_module_identifier,
      'as',
      $._qualified_module_identifier
    ),

    import_spec: $ => seq(
      '(',
      optional(sep1(',', alias($._import, $.import))),
      ')'
    ),

    hidden_import_spec: $ => seq(
      'hiding',
      '(',
      optional(sep1(',', alias($._import, $.hidden_import))),
      ')'
    ),

    _import: $ => choice(
      $._variable,
      $._constructor,
      seq(
        $.type_constructor_identifier,
        optional(choice(
          $.all_constructors,
          seq(
            '(',
            optional(sep1(',', choice($._variable, $._constructor))),
            ')'
          )
        ))
      ),
      seq(
        $.type_class_identifier,
        optional(choice(
          $.all_constructors,
          seq(
            '(',
            optional(sep1(',', $._variable)),
            ')'
          )
        ))
      )
    ),

    _empty_import_spec: $ => seq('(',')'),

    _general_declaration: $ => choice(
      $.type_signature,
      $.fixity_declaration
    ),

    _declaration: $ => choice(
      $._general_declaration,
      $.function_declaration,
      $._pragma,
      $.quasi_quotation,
      $.pattern_type_signature,
      $.bidirectional_pattern_synonym,
      $.unidirectional_pattern_synonym
    ),

    bidirectional_pattern_synonym: $ => prec.left(seq(
      'pattern',
      $.constructor_pattern,
      '=',
      $.function_body
    )),

    unidirectional_pattern_synonym: $ => prec.left(seq(
      'pattern',
      $.constructor_pattern,
      '<-',
      $.function_body
    )),

    _top_declaration: $ => choice(
      $.import_declaration,
      $.qualified_import_declaration,
      $.type_synonym_declaration,
      $.algebraic_datatype_declaration,
      $.newtype_declaration,
      $.type_class_declaration,
      $.type_class_instance_declaration,
      $.default_declaration,
      $.foreign_import_declaration,
      $.foreign_export_declaration,
      $.standalone_deriving_declaration,
      $._declaration
    ),

    standalone_deriving_declaration: $ => seq(
      'deriving',
      'instance',
      optional(choice(
        $.overlaps_pragma,
        $.overlapping_pragma,
        $.overlappable_pragma,
        $.incoherent_pragma
      )),
      optional($.scontext),
      choice($.qualified_type_class_identifier, $.type_class_identifier),
      $.instance
    ),

    type_synonym_declaration: $ => seq(
      'type',
      $._simple_type,
      '=',
      alias($._type_pattern, $.type)
    ),

    function_declaration: $ => seq(
      $._funlhs,
      choice(
        repeat1($.function_guard_pattern),
        seq('=', $.function_body)
      )
    ),

    _funlhs: $ => prec.left(choice(
      seq($._variable, repeat($._a_pattern)),
      seq($._pattern, $._op, $._pattern),
      seq($._funlhs, $._a_pattern, repeat($._a_pattern))
    )),

    _a_pattern: $ => prec.left(choice(
      $._variable,
      $.as_pattern,
      $._general_constructor,
      $.labeled_pattern,
      $._literal,
      $.wildcard,
      $.parenthesized_pattern,
      $.tuple_pattern,
      $.list_pattern,
      $.irrefutable_pattern
    )),

    as_pattern: $ => prec.right(1, seq(
      $._variable,
      '@',
      $._a_pattern
    )),

    tuple_pattern: $ => seq(
      '(',
      alias($._pattern, $.pattern),
      ',',
      sep1(',', alias($._pattern, $.pattern)),
      ')'
    ),

    list_pattern: $ => seq(
      '[',
      sep1(',', alias($._pattern, $.pattern)),
      ']'
    ),

    parenthesized_pattern: $ => seq(
      '(',
      $._pattern,
      ')'
    ),

    irrefutable_pattern: $ => seq(
      '~',
      $._a_pattern
    ),

    _pattern: $ => prec.left(choice(
      seq($._lpat, $._op, $._pattern),
      $._lpat
    )),

    _lpat: $ => choice(
      $._a_pattern,
      $.negative_literal,
      $.constructor_pattern
    ),

    constructor_pattern: $ => prec.left(seq(
      $._general_constructor,
      repeat1($._a_pattern),
    )),

    labeled_pattern: $ => seq(
      choice($._qualified_constructor, $._constructor),
      '{',
      sep1(',', $.field_pattern),
      '}'
    ),

    field_pattern: $ => seq(
      choice($._qualified_variable, $._variable),
      '=',
      $._pattern
    ),

    promoted: $ => seq(
      '\'',
      $._general_constructor
    ),

    _general_constructor: $ => choice(
      $._constructor,
      $._qualified_constructor,
      $.unit_constructor,
      $.list_constructor,
      $.function_constructor,
      $.tupling_constructor
    ),

    _general_type_constructor: $ => choice(
      $.type_constructor_identifier,
      $.qualified_type_constructor_identifier,
      $.unit_constructor,
      $.list_constructor,
      $.function_constructor,
      $.tupling_constructor,
      $.promoted
    ),

    unit_constructor: $ => seq('(', ')'),
    list_constructor: $ => seq('[', ']'),
    function_constructor: $ => seq('(', '->', ')'),
    tupling_constructor: $ => seq('(', ',', repeat(','), ')'),

    _statement: $ => choice(
      $._expression,
      $.bind_pattern,
      $.let_statement
    ),

    bind_pattern: $ => seq(
      $._pattern,
      '<-',
      $._expression
    ),

    let_statement: $ => seq(
      'let',
      $._declarations
    ),

    _expression: $ => prec.right(choice(
      $._infix_expression,
      $.expression_type_signature
    )),

    expression_type_signature: $ => seq(
      $._infix_expression,
      alias('::', $.annotation),
      optional($.context),
      $._type_pattern
    ),

    _infix_expression: $ => choice(
      $._lexp,
      $.prefix_negation,
      $.infix_operator_application
    ),

    infix_operator_application: $ => prec.right(seq(
      $._lexp,
      $._qualified_operator,
      $._infix_expression
    )),

    _lexp: $ => choice(
      $.lambda,
      $.let_expression,
      $.conditional_expression,
      $.case_expression,
      $.do,
      $.function_application,
      $._a_expression,
      $.quasi_quotation
    ),

    lambda: $ => seq(
      $.lambda_head,
      '->',
      alias($._expression, $.lambda_body)
    ),

    lambda_head: $ => seq(
      '\\',
      repeat1($._a_pattern)
    ),

    prefix_negation: $ => prec.left(seq(
      '-',
      $._infix_expression
    )),

    left_operator_section: $ => seq(
      '(',
      $._infix_expression,
      $._qualified_operator,
      ')'
    ),

    right_operator_section: $ => seq(
      '(',
      $._qualified_operator,
      $._infix_expression,
      ')'
    ),

    arithmetic_sequence: $ => seq(
      '[',
      choice(
        $.enum_from,
        $.enum_from_then,
        $.enum_from_to,
        $.enum_from_then_to
      ),
      ']'
    ),

    list_comprehension: $ => seq(
      '[',
      $._expression,
      '|',
      sep1(',', choice(prec.dynamic(1, $.generator), $._expression)),
      ']'
    ),

    generator: $ => seq(
      $._pattern,
      '<-',
      $._expression
    ),

    enum_from: $ => seq(
      $._expression,
      '..'
    ),

    enum_from_then: $ => seq(
      $._expression,
      ',',
      $._expression,
      '..'
    ),

    enum_from_to: $ => seq(
      $._expression,
      '..',
      $._expression
    ),

    enum_from_then_to: $ => seq(
      $._expression,
      ',',
      $._expression,
      '..',
      $._expression
    ),

    function_body: $ => choice(
      seq(
        $._expression,
        optional($.where)
      ),
      seq(
        $.function_guard_pattern,
        optional($.where)
      )
    ),

    _top_where: $ => seq(
      'where',
      $._top_declarations
    ),

    where: $ => seq(
      'where',
      $._declarations
    ),

    let_expression: $ => seq(
      'let',
      $._declarations,
      $.in_clause
    ),

    in_clause: $ => seq(
      'in',
      $._expression
    ),

    case_expression: $ => seq(
      'case',
      $._expression,
      'of',
      choice(
        seq(
          '{',
          sep1($._terminal, $.alternative),
          optional($._terminal),
          '}'
        ),
        seq(
          $._layout_open_brace,
          repeat(seq($.alternative, $._layout_semicolon)),
          $._layout_close_brace
        )
      )
    ),

    alternative: $ => prec.right(choice(
      seq(
        $._pattern,
        '->',
        $._expression,
        optional($.where)
      ),
      seq(
        $._pattern,
        $.case_guard_pattern,
        optional($.where)
      )
    )),

    case_guard_pattern: $ => seq(
      $._guards,
      '->',
      $._expression
    ),

    _guards: $ => seq(
      '|',
      sep1(',', $.guard),
    ),

    function_guard_pattern: $ => seq(
      $._guards,
      '=',
      $._expression
    ),

    guard: $ => choice(
      seq(
        $._pattern,
        '<-',
        $._expression
      ),
      $.let_statement,
      $._expression
    ),

    parenthesized_expression: $ => seq(
      '(',
      $._expression,
      ')'
    ),

    negative_literal: $ => prec(1, seq('-', '(', choice($.integer, $.float), ')')),

    field_update: $ => seq(
      choice($._variable, $.quasi_quotation),
      $.fields
    ),

    fields: $ => seq(
      '{',
      sep1(',', choice($.field, $.field_label)),
      '}'
    ),

    field_label: $ => seq(
      $._variable,
      '=',
      $._expression
    ),

    wildcard: $ => '_',

    function_application: $ => prec.left(seq(
      choice($.function_application, $._a_expression),
      choice($.function_application, $._a_expression)
    )),

    _a_expression: $ => choice(
      $._general_constructor,
      $._qualified_variable,
      $._variable,
      $._literal,
      $.parenthesized_expression,
      $.tuple_expression,
      $.list_expression,
      $.arithmetic_sequence,
      $.list_comprehension,
      $.left_operator_section,
      $.right_operator_section,
      $.labeled_construction,
      $.labeled_update,
      prec.dynamic(1, $.quasi_quotation)
    ),

    labeled_update: $ => seq(
      choice(
        $._qualified_variable,
        $._variable,
        $._literal,
        $.parenthesized_expression,
        $.tuple_expression,
        $.list_expression,
        $.arithmetic_sequence,
        $.list_comprehension,
        $.left_operator_section,
        $.right_operator_section,
        $.labeled_construction,
        $.labeled_update,
        $.quasi_quotation
      ),
      '{',
      sep1(',', $.field_bind),
      '}'
    ),

    labeled_construction: $ => seq(
      choice($._qualified_constructor, $._constructor),
      '{',
      optional(sep1(',', $.field_bind)),
      '}'
    ),

    field_bind: $ => seq(
      choice($._qualified_variable, $._variable),
      '=',
      $._expression
    ),

    list_expression: $ => seq(
      '[',
      sep1(',', $._expression),
      ']'
    ),

    tuple_expression: $ => seq(
      '(',
      $._expression,
      ',',
      sep1(',', $._expression),
      ')'
    ),

    _function_application_statements: $ => choice(
      $._variable,
      $._literal,
      $.list,
      $.list_comprehension
    ),

    _terminal: $ => ';',

    foreign_import_declaration: $ => seq(
      'foreign',
      'import',
      $._foreign_declaration
    ),

    foreign_export_declaration: $ => seq(
      'foreign',
      'export',
      $._foreign_declaration
    ),

    _foreign_declaration: $ => seq(
      $.calling_convention,
      optional($.safety),
      optional($.string),
      $.type_signature
    ),

    calling_convention: $ => choice(
      'ccall',
      'stdcall',
      'cplusplus',
      'jvm',
      'dotnet'
    ),

    safety: $ => choice(
      'unsafe',
      'safe'
    ),

    default_declaration: $ => seq(
      'default',
      '(',
      optional(sep1(',', $._type_pattern)),
      ')'
    ),

    do: $ => seq(
      'do',
      $._statements
    ),

    conditional_expression: $ => seq(
      'if',
      $._expression,
      optional($._terminal),
      'then',
      $._expression,
      optional($._terminal),
      'else',
      $._expression
    ),

    type_class_declaration: $ => seq(
      'class',
      optional($.scontext),
      seq(
        $.type_class_identifier,
        repeat($.type_variable_identifier)
      ),
      $.where
    ),

    type_class_instance_declaration: $ => seq(
      'instance',
      optional(choice(
        $.overlaps_pragma,
        $.overlapping_pragma,
        $.overlappable_pragma,
        $.incoherent_pragma
      )),
      optional($.scontext),
      choice($.qualified_type_class_identifier, $.type_class_identifier),
      $.instance,
      $.where
    ),

    instance: $ => prec.left(repeat1(choice(
      $._general_type_constructor,
      $.parenthesized_type_constructor,
      $.tuple_instance,
      $.list_instance,
      $.function_type_instance,
      $.type_variable_identifier
    ))),

    parenthesized_type_constructor: $ => seq(
      '(',
      $._general_type_constructor,
      repeat(choice($.type_variable_identifier, $.promoted)),
      ')'
    ),

    tuple_instance: $ => seq(
      '(',
      choice($.type_variable_identifier, $._general_type_constructor),
      ',',
      sep1(',', choice($.type_variable_identifier, $._general_type_constructor)),
      ')'
    ),

    list_instance: $ => seq(
      '[',
      choice($.type_variable_identifier, $._general_type_constructor),
      ']'
    ),

    kind_function_type_instance: $ => seq(
      '(',
      sep1('->', $._kind_pattern),
      ')'
    ),

    function_type_instance: $ => prec(1, seq(
      '(',
      sep1('->', $.type_variable_identifier),
      ')'
    )),

    fixity_declaration: $ => seq(
      choice('infixl', 'infixr', 'infix'),
      optional($.integer),
      sep1(',', $._op)
    ),

    _op: $ => choice(
      $.variable_operator,
      $.constructor_operator,
      $.type_operator
    ),

    type_signature: $ => seq(
      sep1(',', $._variable),
      alias('::', $.annotation),
      optional($.scoped_type_variables),
      optional($.context),
      $._type_pattern
    ),

    kind_signature: $ => seq(
      sep1(',', $.type_variable_identifier),
      alias('::', $.annotation),
      $._kind_pattern
    ),

    _kind: $ => prec.left(repeat1($._akind)),

    _kind_pattern: $ => prec.left(choice(
      $._kind,
      $.kind_function_type
    )),

    _akind: $ => choice(
      alias('*', $.star),
      $.kind_tuple_type,
      $.kind_list_type,
      $.kind_parenthesized_constructor
    ),

    kind_function_type: $ => prec.right(seq(
      choice(
        alias($._kind, $.kind),
      ),
      '->',
      choice(
        alias($._kind, $.kind),
        $.kind_function_type
      )
    )),

    pattern_type_signature: $ => seq(
      'pattern',
      $._constructor,
      alias('::', $.annotation),
      $._type_pattern
    ),

    scoped_type_variables: $ => seq(
      'forall',
      repeat1($.variable_identifier),
      '.'
    ),

    _type_pattern: $ => prec.left(choice(
      $._type,
      $.function_type,
      $.infix_type_operator_application
    )),

    _type: $ => prec.left(repeat1($._atype)),

    function_type: $ => prec.right(seq(
      alias($._type, $.type),
      '->',
      choice(
        alias($._type, $.type),
        $.function_type
      )
    )),

    _atype: $ => choice(
      $._general_type_constructor,
      $.type_variable_identifier,
      $.tuple_type,
      $.list_type,
      $.parenthesized_constructor
    ),

    infix_type_operator_application: $ => prec.right(seq(
      alias($._type_pattern, $.type),
      $.type_operator,
      $._type_pattern
    )),

    tuple_type: $ => seq(
      '(',
      $._type_pattern,
      ',',
      sep1(',', $._type_pattern),
      ')'
    ),

    kind_tuple_type: $ => seq(
      '(',
      $._kind_pattern,
      ',',
      sep1(',', $._kind_pattern),
      ')'
    ),

    list_type: $ => seq(
      '[',
      $._type_pattern,
      ']'
    ),

    kind_list_type: $ => seq(
      '[',
      $._kind_pattern,
      ']'
    ),

    parenthesized_constructor: $ => seq(
      '(',
      $._type_pattern,
      ')'
    ),

    kind_parenthesized_constructor: $ => seq(
      '(',
      $._kind_pattern,
      ')'
    ),

    function_identifier: $ => sep1(',', $._variable),

    tuple: $ => seq(
      '(',
      $._pattern,
      ',',
      sep1(',', $._pattern),
      ')'
    ),

    list: $ => seq(
      '[',
      sep1(',', choice($._expression)),
      ']'
    ),

    algebraic_datatype_declaration: $ => prec.right(seq(
      'data',
      optional($.context),
      $._simple_type,
      optional(
        seq(
          '=',
          $.constructors,
          optional($.deriving)
        )
      )
    )),

    _simple_type: $ => prec.left(seq(
      $.type_constructor_identifier,
      repeat(
        choice(
          $.type_variable_identifier,
          seq(
            '(',
            $.kind_signature,
            ')'
          )
        )
      )
    )),

    scontext: $ => seq(
      choice(
        $.simple_class,
        seq(
          '(',
          optional(sep1(',', $.simple_class)),
          ')'
        )
      ),
      '=>'
    ),

    context: $ => prec(1, seq(
      choice(
        $.class,
        $.equality_constraint,
        seq(
          '(',
          optional(sep1(',', choice($.class, $.equality_constraint))),
          ')'
        ),
      ),
      '=>'
    )),

    simple_class: $ => seq(
      choice($.qualified_type_class_identifier, $.type_class_identifier),
      repeat1(choice(
        $.type_variable_identifier,
        $.parenthesized_type_variables,
        $.promoted,
        $.parenthesized_type_constructor
      ))
    ),

    parenthesized_type_variables: $ => seq(
      '(',
      repeat1($.type_variable_identifier),
      ')'
    ),

    class: $ => choice(
      seq(
        choice(
          $.constructor_identifier,
          $.qualified_constructor_identifier
        ),
        $.type_variable_identifier
      ),
      seq(
        choice(
          $.constructor_identifier,
          $.qualified_constructor_identifier
        ),
        '(',
        $.type_variable_identifier,
        repeat1($._atype),
        ')'
      )
    ),

    equality_constraint: $ => prec(1, seq(
      alias($._type_pattern, $.equality_lhs),
      '~',
      alias($._type_pattern, $.equality_rhs)
    )),

    constructors: $ => sep1(
      '|',
      choice(
        $.data_constructor,
        $.infix_data_constructor,
        $.record_data_constructor
      )
    ),

    data_constructor: $ => prec.left(seq(
      $._constructor,
      repeat(
        seq(
          optional(
            choice(
              $.unpack_pragma,
              $.no_unpack_pragma
            )
          ),
          choice(
            $.strict_type,
            $._atype
          )
        )
      )
    )),

    strict_type: $ => seq(
      '!',
      $._type_pattern
    ),

    infix_data_constructor: $ => prec.left(seq(
      optional('!'),
      repeat1($._atype),
      $.constructor_operator,
      optional('!'),
      repeat1($._atype)
    )),

    record_data_constructor: $ => seq($._constructor, $.fields),

    deriving: $ => seq(
      'deriving',
      choice(
        choice($.qualified_type_class_identifier, $.type_class_identifier),
        seq(
          '(',
          optional(sep1(',', choice($.qualified_type_class_identifier, $.type_class_identifier))),
          ')'
        )
      )
    ),

    newtype_declaration: $ => prec.left(seq(
      'newtype',
      optional($.context),
      $._simple_type,
      '=',
      $.new_constructor,
      optional($.deriving)
    )),

    new_constructor: $ => choice(
      seq(
        $._constructor,
        $._atype
      ),
      seq(
        $._constructor,
        $.fields
      )
    ),

    field: $ => prec.left(seq(
      sep1(',', $._variable),
      alias('::', $.annotation),
      choice(
        $.strict_type,
        $._type_pattern
      )
    )),

    _literal: $ => choice(
      $.integer,
      $.float,
      $.string,
      $.char
    ),

    _variable: $ => choice(
      $.variable_identifier,
      seq(
        '(',
        $.variable_operator,
        ')'
      )
    ),

    _qualified_variable: $ => choice(
      $.qualified_variable_identifier,
      seq(
        '(',
        $.qualified_variable_operator,
        ')'
      )
    ),

    _constructor: $ => choice(
      $.constructor_identifier,
      seq(
        '(',
        $.constructor_operator,
        ')'
      )
    _qualified_module_identifier: $ => choice(
      $.qualified_module_identifier,
      $.module_identifier
    ),

    _qualified_constructor: $ => choice(
      $.qualified_constructor_identifier,
      seq(
        '(',
        $.qualified_constructor_operator,
        ')'
      )
    qualified_module_identifier: $ => seq(
      sep1($._qualified_module_dot, $.module_identifier),
      $._qualified_module_dot,
      $.module_identifier
    ),


    constructor_identifier: $ => $._constructor_identifier,

    type_constructor_identifier: $ => $._constructor_identifier,

    // Higher precedence here to disambiguate scontext
    type_class_identifier: $ => $._constructor_identifier,

    qualified_constructor_identifier: $ => seq(
      $._qualified_module_identifier,
      $._qualified_module_dot,
    ),

    qualified_constructor_operator: $ => seq(
      $.constructor_operator
    ),

    qualified_type_constructor_identifier: $ => seq(
      $.constructor_identifier
      $._qualified_module_identifier,
      $._qualified_module_dot,
    ),

    qualified_type_class_identifier: $ => seq(
      $.constructor_identifier
    ),

    _constructor_identifier: $ => /[A-Z](\w|')*/,
    variable_identifier: $ => $._variable_identifier,

    type_variable_identifier: $ => prec(1, $._variable_identifier),

    qualified_variable_identifier: $ => seq(
      $._qualified_module_identifier,
      $._qualified_module_dot,
      $.variable_identifier
    ),

    qualified_variable_operator: $ => seq(
      choice($.qualified_module_identifier, $.module_identifier),
      '.',
      $._qualified_module_identifier,
      $._qualified_module_dot,
      $.variable_operator
    ),


    module_identifier: $ => /[A-Z](\w|')*/,

    variable_symbol: $ => token(
      seq(
        variable_symbol,
        repeat(choice(restricted_variable_symbol, variable_symbol))
      )
    ),

    infix_variable_identifier: $ => seq(
      '`',
      $._variable_identifier,
      '`'
    ),

    qualified_infix_variable_identifier: $ => seq(
      '`',
      $.qualified_variable_identifier,
      '`'
    ),

    variable_operator: $ => choice(
      $.variable_symbol,
      $.infix_variable_identifier,
      $.qualified_infix_variable_identifier
    ),

    type_operator: $ => token(seq(
      '\'',
      repeat1(choice(variable_symbol, restricted_variable_symbol))
    )),

    constructor_symbol: $ => token(
      seq(
        ':',
        repeat(constructor_symbol)
      )
    ),

    infix_constructor_identifier: $ => seq(
      '`',
      $._constructor_identifier,
      '`'
    ),

    qualified_infix_constructor_identifier: $ => seq(
      '`',
      $.qualified_constructor_identifier,
      '`'
    ),

    constructor_operator: $ => choice(
      $.constructor_symbol,
      $.infix_constructor_identifier
    ),

    _qualified_operator: $ => choice(
      $.qualified_variable_operator,
      $.variable_operator,
      $.qualified_constructor_operator,
      $.constructor_operator
    ),

    _variable_identifier: $ => /[_a-z](\w|')*/,

    _pragma: $ => choice(
      $.inline_pragma,
      $.inlinable_pragma,
      $.no_inline_pragma,
      $.specialization_pragma,
      $.options_ghc_pragma,
      $.source_pragma,
      $.include_pragma,
      $.warning_pragma,
      $.deprecated_pragma,
      $.line_pragma,
      $.column_pragma,
      $.minimal_pragma,
      $.unpack_pragma,
      $.no_unpack_pragma,
      $.complete_pragma,
      $.overlapping_pragma,
      $.overlappable_pragma,
      $.overlaps_pragma,
      $.incoherent_pragma,
      $.rules_pragma
    ),

    inline_pragma: $ => seq(
      '{-#',
      'INLINE',
      optional(alias('CONLIKE', $.constructor_like)),
      optional(choice($.phase_control, $.eager_phase_control)),
      choice($._qualified_variable, $._variable),
      '#-}'
    ),

    inlinable_pragma: $ => seq(
      '{-#',
      choice('INLINABLE', 'INLINEABLE'),
      optional(choice($.phase_control, $.eager_phase_control)),
      choice($._qualified_variable, $._variable),
      '#-}'
    ),

    no_inline_pragma: $ => seq(
      '{-#',
      'NOINLINE',
      optional(alias('CONLIKE', $.constructor_like)),
      optional(choice($.phase_control, $.eager_phase_control)),
      choice($._qualified_variable, $._variable),
      '#-}'
    ),

    specialization_pragma: $ => seq(
      '{-#',
      choice('SPECIALIZE', 'SPECIALISE'),
      optional(choice(alias('INLINE', $.inline), alias('NOINLINE', $.noinline))),
      optional($.phase_control),
      choice(
        sep1(',', $.spec),
        $.instance_spec
      ),
      '#-}'
    ),

    options_ghc_pragma: $ => seq(
      '{-#',
      'OPTIONS_GHC',
      $.option,
      '#-}'
    ),

    source_pragma: $ => seq(
      '{-#',
      'SOURCE',
      '#-}'
    ),

    include_pragma: $ => seq(
      '{-#',
      'INCLUDE',
       $.header_file,
      '#-}'
    ),

    warning_pragma: $ => seq(
      '{-#',
      'WARNING',
      optional(sep1(',', $.variable_identifier)),
      choice(
        alias($.string, $.warning_message),
        $.warning_message_list
      ),
      '#-}'
    ),

    deprecated_pragma: $ => seq(
      '{-#',
      'DEPRECATED',
      optional(sep1(',', $.variable_identifier)),
      choice(
        alias($.string, $.deprecated_message),
        $.deprecated_message_list
      ),
      '#-}'
    ),

    deprecated_message_list: $ => seq(
      '[',
      sep1(',', alias($.string, $.deprecated_message)),
      ']'
    ),

    warning_message_list: $ => seq(
      '[',
      sep1(',', alias($.string, $.warning_message)),
      ']'
    ),

    line_pragma: $ => seq(
      '{-#',
      'LINE',
      alias($.integer, $.line_number),
      alias($.string, $.file_name),
      '#-}'
    ),

    column_pragma: $ => seq(
      '{-#',
      'COLUMN',
      alias($.integer, $.column_number),
      '#-}'
    ),

    minimal_pragma: $ => seq(
      '{-#',
      'MINIMAL',
      repeat(
        choice(
          $._variable,
          $._constructor,
          $.conjunction,
          $.disjunction
        )
      ),
      '#-}'
    ),

    unpack_pragma: $ => seq(
      '{-#',
      'UNPACK',
      '#-}'
    ),

    no_unpack_pragma: $ => seq(
      '{-#',
      'NOUNPACK',
      '#-}'
    ),

    complete_pragma: $ => seq(
      '{-#',
      'COMPLETE',
      sep1(',', $._a_expression),
      '#-}'
    ),

    overlapping_pragma: $ => seq(
      '{-#',
      'OVERLAPPING',
      '#-}'
    ),

    overlappable_pragma: $ => seq(
      '{-#',
      'OVERLAPPABLE',
      '#-}'
    ),

    overlaps_pragma: $ => seq(
      '{-#',
      'OVERLAPS',
      '#-}'
    ),

    incoherent_pragma: $ => seq(
      '{-#',
      'INCOHERENT',
      '#-}'
    ),

    rules_pragma: $ => seq(
      '{-#',
      'RULES',
      $._layout_open_brace,
      repeat(seq($.rule, choice($._terminal, $._layout_semicolon))),
      $._layout_close_brace,
      '#-}'
    ),

    rule: $ => seq(
      alias($.string, $.name),
      optional($.phase_control),
      $.rule_pattern_variables,
      alias($._expression, $.rule_lhs),
      '=',
      alias($._expression, $.rule_rhs)
    ),

    rule_pattern_variables: $ => seq(
      'forall',
      repeat1(
        choice(
          alias($.variable_identifier, $.pattern_variable),
          $.pattern_variable_type_signature
        )
      ),
      '.'
    ),

    pattern_variable_type_signature: $ => seq(
      optional('('),
      alias($.variable_identifier, $.pattern_variable),
      alias('::', $.annotation),
      optional($.rule_pattern_variables),
      $._type_pattern,
      optional(')')
    ),

    // In this context, conjunction means both sides are required (AND).
    conjunction: $ => prec.left(2, seq(
      choice($._variable, $._constructor),
      ',',
      sep1(',', choice($._variable, $._constructor))
    )),

    // In this context, disjunction means only one side is required (OR).
    disjunction: $ => prec.left(1, seq(
      choice($._variable, $._constructor, $.conjunction),
      '|',
      sep1('|', choice($._variable, $._constructor, $.conjunction))
    )),

    phase_control: $ => seq(
      '[',
      $.integer,
      ']'
    ),

    eager_phase_control: $ => seq(
      '[',
      '~',
      $.integer,
      ']'
    ),

    header_file: $ => /("|<)[a-z].*\.h("|>)/,

    option: $ => /[\-a-z]*/,

    spec: $ => seq(
      sep1(',', $._variable),
      alias('::', $.annotation),
      $._type_pattern
    ),

    instance_spec: $ => seq(
      'instance',
      choice($.qualified_type_class_identifier, $.type_class_identifier),
      $._a_pattern
    ),

    language_pragma: $ => seq(
      seq('{-#'),
      'LANGUAGE',
      sep1(',', $.language_name),
      seq('#-}')
    ),

    language_name: $ => /[A-Z](\w|')*/,

    comment: $ => token(choice(
      seq('--', /.*/),
      seq(
        '{-',
        /[^#].*\r?\n?/,
        repeat(choice(
          /[^-]/,
          /-[^}]/
        )),
        /-}\r?\n/
      )
    )),

    integer: $ => choice(
      $._integer_literal,
      $._octal_literal,
      $._hexidecimal_literal
    ),

    float: $ => token(floatLiteral),

    char: $ => seq(
      "'",
      choice(
        $._graphic,
        $._space,
        $._escape,
        '"',
        '\''
      ),
      "'"
    ),

    string: $ => seq(
      '"',
      repeat(choice(
        $._graphic,
        $._escape,
        $._gap,
        "'"
      )),
      '"'
    ),

    // TODO: add any unicode character defined as whitespace
    _gap: $ => choice(
      $._space,
      $._newline,
      $._tab,
      $._vertical_tab
    ),

    _graphic: $ => choice(
      $._small,
      $._large,
      $._symbol,
      digit,
      $._special
    ),

    // TODO: any lowercase unicode letter
    _small: $ => choice(
      /[a-z]/,
      '_'
    ),

    // TODO: any uppercase or titlecase unicode letter
    _large: $ => choice(
      $._ascii_large
    ),

    _ascii_large: $ => /[A-Z]/,

    // TODO: any Unicode symol or punctuation
    _symbol: $ => choice(
      '!',
      '#',
      '$',
      '%',
      '&',
      '⋆',
      '+',
      '.',
      '/',
      '<',
      '=',
      '>',
      '?',
      '@',
      '^',
      '|',
      '-',
      '~',
      ':',
      '\\',
      '*',
      ','
    ),

    _special: $ => choice(
      '(',
      ')',
      ';',
      '[',
      ']',
      '`',
      '{',
      '}'
    ),

    _space: $ => ' ',

    _newline: $ => '\n',

    _tab: $ => '\t',

    _vertical_tab: $ => '\v',

    _escape: $ => prec(1, seq(
      '\\',
      choice(
        $._char_escape,
        $._ascii,
        digit,
        hexidecimal,
        octadecimal
      )
    )),

    _char_escape: $ => choice(
      'a',
      'b',
      'f',
      'n',
      'r',
      't',
      'v',
      '\\',
      '"',
      "'",
      '&'
    ),

    _ascii: $ => choice(
      seq('^', $._cntrl),
      'NUL',
      'SOH',
      'STX',
      'ETX',
      'EOT',
      'ENQ',
      'ACK',
      'BEL',
      'BS',
      'HT',
      'LF',
      'VT',
      'FF',
      'CR',
      'SO',
      'SI',
      'DLE',
      'DC1',
      'DC2',
      'DC3',
      'DC4',
      'NAK',
      'SYN',
      'ETB',
      'CAN',
      'EM',
      'SUB',
      'ESC',
      'FS',
      'GS',
      'RS',
      'US',
      'SP',
      'DEL'
    ),

    _cntrl: $ => choice(
      $._ascii_large,
      '@',
      '[',
      ']',
      '\\',
      '^',
      '_'
    ),

    _integer_literal: $ => token(decimalLiteral),
    _octal_literal:   $ => token(octalLiteral),
    _hexidecimal_literal: $ => token(hexLiteral),

    quasi_quotation: $ => seq(
      choice(
        seq(
          '[',
          choice(
            alias('p', $.pattern),
            alias('d', $.declaration),
            alias('t', $.type),
            alias('e', $.expression),
            alias($._variable_identifier, $.quoter)
          ),
          '|'
        ),
        alias($._empty_quasi_pattern, $.expression),
      ),
      $.quasi_quotation_expression
    ),

    _empty_quasi_pattern: $ => seq('[', '|'),

    quasi_quotation_expression: $ => seq(
      repeat(/[^|]/),
      /.*\|\s*\]/
    )
  }
})

function sep1(sep, rule) {
  return seq(rule, repeat(seq(sep, rule)))
}
