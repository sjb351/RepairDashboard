
import { useEffect, useMemo, useRef, useState } from "react"
import { Modal, Row, Col, Button, Form } from "react-bootstrap"
import APIBackend from "./RestAPI"
import { end } from "@popperjs/core"

export function ListSelectModal({ show, title, topic, handleClose, fullscreen, addEndpoint, onItemAdded, current_data , dropDownKeys=[], editableKeys=[], tag_to_store = null, photoOption=false, photoEndpoint=null, photoRelationKey=null, multiSelect=false, onSelectionChange, onSelectionSubmit}) {


  const [formValues, setFormValues] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [tag, setTag] = useState(tag_to_store)
  const [photoSubmitting, setPhotoSubmitting] = useState(false)
  const [photoError, setPhotoError] = useState("")
  const [photoTarget, setPhotoTarget] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [photoIdAdded, setPhotoIdAdded] = useState([])

  useEffect(() => {
      loadData()
  }, [show, loaded])

  useEffect(() => {
    if (!show) {
      setSelectedIds([])
      setPhotoIdAdded([])
    }
  }, [show])

  useEffect(() => {
    if (!Array.isArray(dataLoaded) || dataLoaded.length === 0) {
      setSelectedIds([])
    } else {
      const available = new Set(dataLoaded.map(item => item.id))
      setSelectedIds(prev => prev.filter(id => available.has(id)))
    }
  }, [dataLoaded])

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedIds)
    }
  }, [selectedIds, onSelectionChange])

  useEffect(() => {
    if (!show) {
      stopCamera()
    }
  }, [show])

  useEffect(() => {
    if (!cameraOpen) {
      return
    }
    let active = true
    let stream = null
    const initCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhotoError("Camera is not available on this device.")
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
        if (!active) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setCameraReady(true)
        }
      } catch (err) {
        setPhotoError(err?.message ?? "Unable to access camera.")
      }
    }
    initCamera()
    return () => {
      active = false
      if (stream?.getTracks) {
        stream.getTracks().forEach(track => track.stop())
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setCameraReady(false)
    }
  }, [cameraOpen])

const loadData = async () => {
  let response = await APIBackend.api_get(addEndpoint);
      if (response.status === 200) {
        let raw_data = response.payload;
        if (!Array.isArray(raw_data)) {
          raw_data = [raw_data]
        }
        let data = raw_data;
        
        try {
          let product_id = current_data?.product_id
          data = raw_data.filter(item => item.product_id === product_id);
        } catch (error) {
          console.error("Error filtering data:", error)
        }
        setDataLoaded(data)
        setLoaded(true)
      } else {
        console.error("Unable to load  " + topic, response)
      }
      
    }

  const handleFieldChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }))
  }
  const handleClick = (id) => {
    setSelectedIds([id])
  }

  const handleToggleSelect = (id) => {

    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(existing => existing !== id)
      }
      return [...prev, id]
    })
  }

  const handleAdd = async (event) => {
    event.preventDefault()
    if (!addEndpoint ) {
      return
    }
    setSubmitting(true)
    setSubmitError("")
    setLoaded(false)
    try {
      const payload = { ...(current_data ?? {}), ...formValues }
      const response = await APIBackend.api_post(addEndpoint, payload)
      if (response.status >= 200 && response.status < 300) {
        setFormValues(editableKeys.reduce((acc, key) => ({ ...acc, [key]: "" }), {}))
        if (onItemAdded) {
          onItemAdded(response.payload)
        }
      } else {
        setSubmitError(`Unable to add item (status ${response.status})`)
      }
    } catch (err) {
      setSubmitError(err?.message ?? "Unable to add item")
    } finally {
      setSubmitting(false)
    }
    
  }

  const handleSubmitSelection = () => {
    if (onSelectionSubmit) {
      console.log(selectedIds)
      const key = tag ?? "tag"
      const keyphoto = "photo_id"
      if (multiSelect) {
        onSelectionSubmit({ [key]: selectedIds, [keyphoto]: photoIdAdded })
      }else {
        onSelectionSubmit({ [key]: selectedIds[0] ?? null, [keyphoto]: photoIdAdded[0] })
      }
    }
  }

  const buildPhotoTitle = (item) => {
    const name = item?.name ?? topic ?? "Item"
    return `${name} photo`
  }

  const stopCamera = () => {
    setCameraOpen(false)
  }

  const startCamera = () => {
    setCameraOpen(true)
  }

  const handlePhotoClick = (item) => {
    if (!photoOption) {
      return
    }
    setPhotoError("")
    setPhotoTarget(item)
    startCamera()
  }

  const handleCapturePhoto = async () => {
    if (!photoTarget || !videoRef.current || !canvasRef.current) {
      return
    }
    const endpoint = photoEndpoint ?? ""
    if (!endpoint) {
      setPhotoError("No photo endpoint configured.")
      return
    }
    setPhotoSubmitting(true)
    setPhotoError("")
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth || 1280
      canvas.height = video.videoHeight || 720
      const context = canvas.getContext("2d")
      if (!context) {
        setPhotoError("Unable to capture photo.")
        return
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9))
      if (!blob) {
        setPhotoError("Unable to capture photo.")
        return
      }
      const imageDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error("Unable to read photo data."))
        reader.readAsDataURL(blob)
      })

      let payload = {
        title: buildPhotoTitle(photoTarget),
        feature_id: selectedIds[0] ?? null,
        image: imageDataUrl,
      }
      if (current_data?.product_id) {
        payload = { ...payload, product_id: current_data.product_id }
      } else if (photoTarget?.product_id) {
        payload = { ...payload, product_id: photoTarget.product_id }
      }
      if (photoRelationKey && photoTarget?.id) {
        payload = { ...payload, [photoRelationKey]: photoTarget.id }
      }
      const response = await APIBackend.api_post(endpoint, payload)
      if (response.status >= 200 && response.status < 300) {
        const newPhotoId = response.payload?.id
        if (newPhotoId != null) {
          setPhotoIdAdded(prev => [...prev, newPhotoId])
        }
        setLoaded(false)
        stopCamera()
      } else {
        setPhotoError(`Unable to upload photo (status ${response.status})`)
      }
    } catch (err) {
      setPhotoError(err?.message ?? "Unable to upload photo")
    } finally {
      setPhotoSubmitting(false)
    }
  }

  return <Modal show={show} size="lg" fullscreen={fullscreen} onHide={handleClose}>
    <Modal.Header closeButton>
      <Modal.Title>{title} - {topic}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Row className='gx-2 gy-2'>
        {dataLoaded.length > 0 ? (<>
        {dataLoaded.map(item => (
          <Col xs={12} sm={6} md={4} lg={3} key={item.id} className='d-grid'>
            <div className="d-grid gap-2">
              <Button
                variant={selectedIds.includes(item.id) ? "primary" : "secondary"}
                aria-pressed={selectedIds.includes(item.id)}
                onClick={() => {
                  if (multiSelect) {
                    handleToggleSelect(item.id)
                  } else {
                    handleClick(item.id)
                  }
                }}
                 size="lg"
              >
                {item.name}
              </Button>
              {photoOption ? (
                <Button
                  variant="light"
                  onClick={() => handlePhotoClick(item)}
                  disabled={photoSubmitting}
                  size="sm"
                >
                  {photoSubmitting && photoTarget?.id === item.id ? "Uploading..." : "Add photo"}
                </Button>
              ) : null}
            </div>
          </Col>
        ))}
        </>) : (<></>)}
      </Row>
      {photoOption ? (
        <>
          {cameraOpen ? (
            <div className="mt-3">
              <div className="border rounded p-2">
                <video ref={videoRef} className="w-100" playsInline muted />
                <canvas ref={canvasRef} style={{ display: "none" }} />
              </div>
              <div className="d-flex gap-2 mt-2">
                <Button
                  variant="primary"
                  onClick={handleCapturePhoto}
                  disabled={!cameraReady || photoSubmitting}
                >
                  {photoSubmitting ? "Uploading..." : "Capture photo"}
                </Button>
                <Button variant="secondary" onClick={stopCamera} disabled={photoSubmitting}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
          {photoError ? <div className="text-danger mt-2">{photoError}</div> : null}
        </>
      ) : null}
    
    <Row className="mt-4">
      <Col></Col>
      
      <Col className="d-grid text-end">
        {selectedIds.length === 0 ? (<>
        <Button type="button" variant="success"  size="lg" onClick={handleSubmitSelection}> 
          No {topic}
        </Button> </>) :(<>
        <Button type="button"  variant="success"  size="lg" onClick={handleSubmitSelection}>
          Submit
        </Button>
        </>)}
        </Col>
      <Col></Col>
  </Row>
  </Modal.Body>

    <Modal.Header>
      <Modal.Title>Add New {topic}</Modal.Title>
    </Modal.Header>
    <Modal.Footer>
     
      <Form className="w-100" onSubmit={handleAdd}>
        <Row className="gx-2 gy-2 align-items-end">
          {editableKeys.map(key => (
            <Col xs={12} sm={6} md={4} key={key}>
              <Form.Group controlId={`list-select-${key}`}>
                <Form.Label>{key}</Form.Label>
                <Form.Control
                  type="text"
                  value={formValues[key] ?? ""}
                  onChange={(event) => handleFieldChange(key, event.target.value)}
                />
              </Form.Group>
            </Col>
          ))}
          <Col xs={12} sm={6} md={4} className="d-grid">
            <Button type="submit" variant="primary" disabled={!addEndpoint || submitting || editableKeys.length === 0}>
              {submitting ? "Adding..." : "Add"}
            </Button>
          </Col>
        </Row>
        {submitError ? <div className="text-danger mt-2">{submitError}</div> : null}
        {!addEndpoint ? <div className="text-muted mt-2">No add endpoint configured.</div> : null}
      </Form>
    </Modal.Footer>
  </Modal>
}
