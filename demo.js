function add(a, b) {
  return a + b
}

function sub(a, b) {
  return a - b
}

function commonDivision(a, b) {
  while (b !== 0) {
    if (a > b) {
      a = sub(a, b)
    } else {
      b = sub(b, a)
    }
  }
  return a
}