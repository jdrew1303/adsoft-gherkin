import R from 'ramda'

export function compileGherkin(ast) {
  let result = []
  const tab = '  '

  function calculateTableColumnSizes(rows) {
    let sizes = []
    rows.forEach(row => {
      row.cells.forEach((cell, index) => {
        if (sizes.length <= index) {
          sizes[index] = cell.value.length
        } else {
          sizes[index] = Math.max(sizes[index], cell.value.length)
        }
      })
    })
    return sizes
  }

  function mergeSizes(sizesA, sizesB) {
    let sizes = []
    const length = Math.max(sizesA.length, sizesB.length)

    for (let i = 0; i < length; i++) {
      sizes[i] = Math.max(
        sizesA[i] || 0,
        sizesB[i] || 0
      )
    }

    return sizes
  }

  const addPadding = R.curry(function addPadding(size, line) {
    return line + R.repeat(' ', size - line.length).join('')
  })

  const mapCell = sizes => (cell, index) => {
    return addPadding(sizes[index], cell.value)
  }

  const mapRow = R.curry((tab, sizes, row) =>
    tab + '| ' + row.cells.map(mapCell(sizes)).join(' | ') + ' |'
  )

  if (ast.language) {
    result.push(`# language: ${ast.language}`)
  }

  if (ast.tags.length > 0) {
    result.push(ast.tags.map(R.prop('name')).join(' '))
  }

  result.push(`${ast.keyword}: ${ast.name}`.trim())

  if (ast.description) {
    result = result.concat(
      ast.description
        .split('\n')
        .map(line => tab + line.trim())
    )
  }

  const backgroundTab = tab + tab

  if (ast.background) {
    result.push(tab + `${ast.background.type}: ${ast.background.name}`)

    if (ast.background.description) {
      result = result.concat(
        ast.background.description
          .split('\n')
          .map(line => backgroundTab + line.trim())
      )
    }

    ast.background.steps.forEach(step => {
      result.push(backgroundTab + step.text)
    })
  }

  ast.scenarioDefinitions.forEach(scenarioDefinition => {
    if (scenarioDefinition.tags.length > 0) {
      result.push(
        tab + scenarioDefinition.tags.map(R.prop('name')).join(' ')
      )
    }

    result.push(tab + `${scenarioDefinition.keyword}: ${scenarioDefinition.name}`)

    const scenarioTab = tab + tab

    if (scenarioDefinition.description) {
      result = result.concat(
        scenarioDefinition.description
          .split('\n')
          .map(line => scenarioTab + line.trim())
      )
    }

    const argumentTab = tab + tab + tab

    scenarioDefinition.steps.forEach(step => {
      result.push(scenarioTab + step.keyword + step.text)

      if (step.argument) {
        switch (step.argument.type) {
          case 'DocString':
            result.push(argumentTab + '"""')
            result = result.concat(
              step.argument.content
                .split('\n')
                .map(line => argumentTab + line)
            )
            result.push(argumentTab + '"""')
            break

          case 'DataTable':
            const sizes = calculateTableColumnSizes(step.argument.rows)
            result = result.concat(
              step.argument.rows.map(mapRow(argumentTab, sizes))
            )
            break

          default:
            throw new Error(`Unknown argument type ${step.argument.type}`)
        }
      }
    })

    if (scenarioDefinition.examples) {
      scenarioDefinition.examples.forEach((example) => {
        const sizes = mergeSizes(
          calculateTableColumnSizes([example.tableHeader]),
          calculateTableColumnSizes(example.tableBody)
        )

        result.push(
          scenarioTab + example.tags.map(R.prop('name')).join(' ')
        )

        result.push(scenarioTab + `${example.keyword}: ${example.name}`)

        const exampleTab = scenarioTab + tab

        if (example.description) {
          result = result.concat(
            example.description
              .split('\n')
              .map(line => exampleTab + line.trim())
          )
        }

        result.push(
          mapRow(argumentTab, sizes, example.tableHeader)
        )

        if (example.tableBody){
          result = result.concat(
            example.tableBody.map(mapRow(argumentTab, sizes))
          )
        }
      })
    }
  })

  return result.join('\n')
}
