import { useEffect, useMemo, useState } from "react"
import { Container, Card, Spinner, Table, Badge, Form, Row, Col } from "react-bootstrap"
import { useParams } from "react-router-dom"
import APIBackend from "./RestAPI"
import { getApiBase } from "./apiBase"

export function ViewRepairDetails({ config }) {
  const [loaded, setLoaded] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [fault, setFault] = useState(null)
  const [features, setFeatures] = useState([])
  const [photos, setPhotos] = useState([])
  const [repairResults, setRepairResults] = useState([])
  const [outcomeFilter, setOutcomeFilter] = useState("all")

  const params = useParams()
  const faultId = Number(params.fault_id)

  const apiBase = getApiBase(config)

  useEffect(() => {
    const doLoad = async () => {
      setPending(true)
      try {
        const [faultRes, featureRes, photoRes, resultRes] = await Promise.all([
          APIBackend.api_get(apiBase + `/faults/${faultId}/`),
          APIBackend.api_get(apiBase + "/features/"),
          APIBackend.api_get(apiBase + "/photos/"),
          APIBackend.api_get(apiBase + "/repair-results/"),
        ])
        if (
          faultRes.status === 200 &&
          featureRes.status === 200 &&
          photoRes.status === 200 &&
          resultRes.status === 200
        ) {
          if (Array.isArray(faultRes.payload)) {
            setFault(faultRes.payload[0] ?? null)
          } else {
            setFault(faultRes.payload)
          }
          setFeatures(Array.isArray(featureRes.payload) ? featureRes.payload : [])
          if (Array.isArray(resultRes.payload)) {
            setRepairResults(resultRes.payload)
          } else {
            setRepairResults([])
          }
          setPhotos(Array.isArray(photoRes.payload) ? photoRes.payload : [])
          setLoaded(true)
        } else {
          setError("Unable to load fault details.")
        }
      } catch (err) {
        setError(err?.message ?? "Unable to load fault details.")
      } finally {
        setPending(false)
      }
    }
    if (!loaded && !pending && !error && faultId) {
      doLoad()
    }
  }, [loaded, pending, error, apiBase, faultId])

  const featuresById = useMemo(() => {
    const map = new Map()
    features.forEach((feature) => map.set(feature.id, feature))
    return map
  }, [features])

  const photosById = useMemo(() => {
    const map = new Map()
    photos.forEach((photo) => map.set(photo.id, photo))
    return map
  }, [photos])

  const photosByFeatureId = useMemo(() => {
    const map = new Map()
    photos.forEach((photo) => {
      const featureId = photo.feature_id
      if (!featureId) {
        return
      }
      if (!map.has(featureId)) {
        map.set(featureId, [])
      }
      map.get(featureId).push(photo)
    })
    return map
  }, [photos])

  const resultsForFault = useMemo(() => {
    if (!faultId) {
      return []
    }
    return repairResults.filter((result) => result.fault_diagnosed === faultId)
  }, [repairResults, faultId])

  const visibleResults = useMemo(() => {
    if (outcomeFilter === "all") {
      return resultsForFault
    }
    return resultsForFault.filter((result) => result.type === outcomeFilter)
  }, [resultsForFault, outcomeFilter])

  const associatedFeatureIds = useMemo(() => fault?.features ?? [], [fault])

  const associatedFeatures = useMemo(() => {
    return associatedFeatureIds
      .map((featureId) => featuresById.get(featureId))
      .filter(Boolean)
  }, [associatedFeatureIds, featuresById])

  const photosForFault = useMemo(() => {
    const ids = new Set()
    resultsForFault.forEach((result) => {
      const photoIds = result?.photo_id ?? []
      if (Array.isArray(photoIds)) {
        photoIds.forEach((id) => ids.add(id))
      } else if (photoIds != null) {
        ids.add(photoIds)
      }
    })
    return Array.from(ids)
      .map((id) => photosById.get(id))
      .filter(Boolean)
  }, [resultsForFault, photosById])

  const normalizedImageUrl = (src) => {
    if (!src) {
      return null
    }
    if (src.startsWith("data:")) {
      return src
    }
    if (src.startsWith("http://") || src.startsWith("https://")) {
      try {
        const parsed = new URL(src)
        if (parsed.pathname.startsWith("/media/")) {
          return parsed.pathname + parsed.search
        }
      } catch (err) {
        return src
      }
      return src
    }
    if (src.startsWith("/")) {
      return src
    }
    return "/" + src
  }

  const formatFaultDiagnosed = (faultIdValue) => {
    if (!faultIdValue) {
      return "-"
    }
    if (fault?.id === faultIdValue) {
      return fault?.name ?? `Fault ${faultIdValue}`
    }
    return `Fault ${faultIdValue}`
  }

  const formatFeatureNames = (featureIds) => {
    if (!featureIds || featureIds.length === 0) {
      return "-"
    }
    const ids = Array.isArray(featureIds) ? featureIds : [featureIds]
    const names = ids
      .map((id) => featuresById.get(id)?.name ?? `Feature ${id}`)
      .filter(Boolean)
    return names.length > 0 ? names.join(", ") : "-"
  }

  const renderPhotoStrip = (photoIds) => {
    if (!photoIds || photoIds.length === 0) {
      return <span className="text-muted">-</span>
    }
    const ids = Array.isArray(photoIds) ? photoIds : [photoIds]
    const items = ids
      .map((id) => photosById.get(id))
      .filter(Boolean)
    if (items.length === 0) {
      return <span className="text-muted">-</span>
    }
    return (
      <div className="d-flex flex-wrap gap-2">
        {items.map((photo) => {
          const imageSrc = normalizedImageUrl(photo.image)
          return imageSrc ? (
            <img
              key={photo.id}
              src={imageSrc}
              alt={photo.title ?? "Repair result photo"}
              style={{ width: "72px", height: "72px", objectFit: "cover" }}
              className="rounded border"
            />
          ) : null
        })}
      </div>
    )
  }

  if (!loaded) {
    return (
      <Container fluid="md">
        <Card className='mt-2 text-center'>
          {error !== null ? <h1>{error}</h1> : <Spinner></Spinner>}
        </Card>
      </Container>
    )
  }

  return (
    <Container fluid="md">
      <Card className="mt-2">
        <Card.Header className="text-center">
          <h1>{fault?.name ?? "Fault details"}</h1>
          {fault?.description && <div className="text-muted">{fault.description}</div>}
        </Card.Header>
        <Card.Body>
          <Card className="mb-3">
            <Card.Header>
              <h2 className="h5 mb-0">Associated features and photos</h2>
            </Card.Header>
            <Card.Body>
              <div>
                <div className="fw-semibold mb-2">Features linked to this fault</div>
                {associatedFeatures.length === 0 ? (
                  <div className="text-muted">No linked features.</div>
                ) : (
                  <Row className="g-3">
                    {associatedFeatures.map((feature) => {
                      const featurePhotos = photosByFeatureId.get(feature.id) ?? []
                      const imageSrc = normalizedImageUrl(featurePhotos[0]?.image)
                      return (
                        <Col key={feature.id} xs={12} sm={6} md={4}>
                          <Card className="h-100">
                            {imageSrc && (
                              <Card.Img
                                variant="top"
                                src={imageSrc}
                                alt={feature.name}
                                style={{ height: "140px", objectFit: "cover" }}
                              />
                            )}
                            <Card.Body>
                              <Card.Title className="h6">{feature.name}</Card.Title>
                              {feature.description && (
                                <Card.Text className="text-muted">{feature.description}</Card.Text>
                              )}
                              <div>
                                <Badge bg="secondary">Linked</Badge>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      )
                    })}
                  </Row>
                )}
              </div>
            </Card.Body>
          </Card>

          <h2 className="h4">Results from previous repairs</h2>
          <Form.Select
            className="mb-3"
            value={outcomeFilter}
            onChange={(event) => setOutcomeFilter(event.target.value)}
            aria-label="Filter by repair outcome"
          >
            <option value="all">All outcomes</option>
            <option value="R">Repaired</option>
            <option value="P">Partial repair</option>
            <option value="N">Not repaired</option>
          </Form.Select>
          {visibleResults.length === 0 ? (
            <div className="text-muted">No repair results linked to this fault.</div>
          ) : (
            <Table responsive bordered hover>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Outcome</th>
                  <th>Fault diagnosed</th>
                  <th>Fault features</th>
                </tr>
              </thead>
              <tbody>
                {visibleResults.map((result) => (
                  <tr key={result.id}>
                    <td>{result.date ?? "-"}</td>
                    <td>{result.type ?? "-"}</td>
                    <td>{formatFaultDiagnosed(result.fault_diagnosed)}</td>
                    <td>{formatFeatureNames(result.fault_features)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  )
}
