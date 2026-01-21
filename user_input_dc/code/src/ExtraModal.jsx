import { useEffect, useState } from "react"
import { Modal, Row, Col, Button, Form } from "react-bootstrap"

export function ExtraModal({ show, title, handleClose, fullscreen, onSelectionSubmit }) {
  const [formValues, setFormValues] = useState({
    notes: "",
    time_to_diagnose: "",
    time_to_repair: "",
  })

  useEffect(() => {
    if (!show) {
      setFormValues({
        notes: "",
        time_to_diagnose: "",
        time_to_repair: "",
      })
    }
  }, [show])

  const handleFieldChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!onSelectionSubmit) {
      return
    }
    const payload = {}
    if (formValues.notes) {
      payload.notes = formValues.notes
    }
    if (formValues.time_to_diagnose) {
      payload.time_to_diagnose = formValues.time_to_diagnose
    }
    if (formValues.time_to_repair) {
      payload.time_to_repair = formValues.time_to_repair
    }
    onSelectionSubmit(payload)
  }

  return (
    <Modal show={show} size="lg" fullscreen={fullscreen} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Row className="gx-2 gy-2">
            <Col xs={12}>
              <Form.Group controlId="extra-notes">
                <Form.Label>Any extra notes or infomation</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formValues.notes}
                  onChange={(event) => handleFieldChange("notes", event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Group controlId="extra-time-to-diagnose">
                <Form.Label>Time spent diagnosing fault (HH:MM:SS)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="00:00:00"
                  value={formValues.time_to_diagnose}
                  onChange={(event) => handleFieldChange("time_to_diagnose", event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Group controlId="extra-time-to-repair">
                <Form.Label>Time spent repairing fault (HH:MM:SS)</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="00:00:00"
                  value={formValues.time_to_repair}
                  onChange={(event) => handleFieldChange("time_to_repair", event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} className="d-grid">
              <Button type="submit" variant="success">
                Submit {title}
              </Button>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
    </Modal>
  )
}
