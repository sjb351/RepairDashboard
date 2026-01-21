import { Container, InputGroup, Form, DropdownButton, Dropdown } from "react-bootstrap"

export function PartBar({ part, setPart, config, inputRef }) {
  let inputs = ""
  if (config?.capture_page?.part_entry === "text") {
    inputs = <>
      <InputGroup.Text>Part:</InputGroup.Text>
      <Form.Control ref={inputRef} placeholder='Part / Product ID' value={part} onChange={(event) => setPart(event.target.value)} />
    </>
  } else {
    let options = config?.capture_page?.part_entry_options ?? []
    inputs = <>
      <DropdownButton
        align="end"
        variant="secondary"
        title={"Part "}
        className="d-grid gap-2"
      >
        {options.map(item => (
          <Dropdown.Item onClick={() => setPart(item)} key={item}>{item}</Dropdown.Item>
        ))}
      </DropdownButton>
      <Form.Control readOnly={true} value={part} />
    </>
  }

  return <Container fluid>
    <InputGroup className="mb-3 w-100">
      {inputs}
    </InputGroup>
  </Container>
}
