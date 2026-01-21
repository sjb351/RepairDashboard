import { useEffect, useMemo, useState } from "react"
import { Container, Card, Col, Row, Button, Table, Spinner, Form, Badge } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import APIBackend from './RestAPI'
import { getApiBase } from "./apiBase"

//todo reasons modification page (download new config file - save in right place)
//todo cancel


export function DataView({ config, product_list }) {
  const [loaded, setLoaded] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [features, setFeatures] = useState([])
  const [faults, setFaults] = useState([])
  const [photos, setPhotos] = useState([])
  const [selectedFeatureIds, setSelectedFeatureIds] = useState([])
  const [featurePhotoIndex, setFeaturePhotoIndex] = useState({})
  let params = useParams();
  const productIdFromRoute = Number(params.product_id)
  const product = product_list?.find(elem => elem.id === productIdFromRoute)
  const [activeProductId, setActiveProductId] = useState(productIdFromRoute || "all")

  const apiBase = getApiBase(config)

  useEffect(() => {
    const doLoad = async () => {
      setPending(true)
      try {
        const [featureRes, faultRes, photoRes] = await Promise.all([
          APIBackend.api_get(apiBase + "/features/"),
          APIBackend.api_get(apiBase + "/faults/"),
          APIBackend.api_get(apiBase + "/photos/"),
        ])
        if (featureRes.status === 200 && faultRes.status === 200 && photoRes.status === 200) {
          setFeatures(featureRes.payload)
          setFaults(faultRes.payload)
          setPhotos(photoRes.payload)
          setLoaded(true)
        } else {
          setError("Unable to load data from the server.")
        }
      } catch (err) {
        setError(err?.message ?? "Unable to load data from the server.")
      } finally {
        setPending(false)
      }
    }
    if (!loaded && !pending && !error) {
      doLoad()
    }
  }, [loaded, pending, error, apiBase])

  useEffect(() => {
    if (productIdFromRoute) {
      setActiveProductId(productIdFromRoute)
      setSelectedFeatureIds([])
    }
  }, [productIdFromRoute])

  const featuresById = useMemo(() => {
    const map = new Map()
    features.forEach((feature) => map.set(feature.id, feature))
    return map
  }, [features])

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

  const visibleFeatures = useMemo(() => {
    if (activeProductId === "all") {
      return features
    }
    return features.filter((feature) => feature.product_id === activeProductId)
  }, [features, activeProductId])

  const visibleFaults = useMemo(() => {
    if (activeProductId === "all") {
      return faults
    }
    return faults.filter((fault) => fault.product_id === activeProductId)
  }, [faults, activeProductId])

  const ranking = useMemo(() => {
    if (selectedFeatureIds.length === 0) {
      return []
    }
    const selectedSet = new Set(selectedFeatureIds)
    return visibleFaults
      .map((fault) => {
        const faultFeatures = fault.features ?? []
        const matched = faultFeatures.filter((id) => selectedSet.has(id))
        return {
          ...fault,
          matchCount: matched.length,
          matchedFeatureIds: matched,
        }
      })
      .filter((fault) => fault.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount || a.name.localeCompare(b.name))
  }, [visibleFaults, selectedFeatureIds])

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

  const toggleFeature = (featureId) => {
    setSelectedFeatureIds((prev) => (
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    ))
  }

  const clearSelection = () => setSelectedFeatureIds([])

  const getPhotoIndex = (featureId, total) => {
    if (!total) {
      return 0
    }
    const current = featurePhotoIndex[featureId] ?? 0
    return ((current % total) + total) % total
  }

  const shiftPhoto = (featureId, total, delta) => {
    if (!total) {
      return
    }
    setFeaturePhotoIndex((prev) => ({
      ...prev,
      [featureId]: getPhotoIndex(featureId, total) + delta,
    }))
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
      <Card className='mt-2'>
        <Card.Header className='text-center'>
          <h1>{product?.name ?? "Data View"}</h1>
          <div className="text-muted">Filter features and see ranked faults.</div>
        </Card.Header>
        <Card.Body>
          <Row className="align-items-end mb-3 g-2">
            <Col xs={12} md={6}>
              {productIdFromRoute ? (
                <div className="text-muted">Showing data for this product only.</div>
              ) : (
                <>
                  <Form.Label className="mb-1">Filter by product</Form.Label>
                  <Form.Select
                    value={activeProductId}
                    onChange={(event) => {
                      const value = event.target.value
                      setActiveProductId(value === "all" ? "all" : Number(value))
                      setSelectedFeatureIds([])
                    }}
                  >
                    <option value="all">All products</option>
                    {product_list.map((product) => (
                      <option key={product.id} value={product.id}>{product.name}</option>
                    ))}
                  </Form.Select>
                </>
              )}
            </Col>
            <Col xs={12} md={6} className="d-flex justify-content-md-end">
              <Button variant="outline-secondary" onClick={clearSelection} disabled={selectedFeatureIds.length === 0}>
                Clear selection
              </Button>
            </Col>
          </Row>

          <Row className="g-3">
            {visibleFeatures.length === 0 ? (
              <Col>
                <Card className="text-center">
                  <Card.Body>No features found for this product.</Card.Body>
                </Card>
              </Col>
            ) : (
              visibleFeatures.map((feature) => {
                const featurePhotos = photosByFeatureId.get(feature.id) ?? []
                const activeIndex = getPhotoIndex(feature.id, featurePhotos.length)
                const imageSrc = normalizedImageUrl(featurePhotos[activeIndex]?.image)
                const isSelected = selectedFeatureIds.includes(feature.id)
                return (
                  <Col key={feature.id} xs={12} md={6} lg={4}>
                    <Card className={isSelected ? "border-primary h-100" : "h-100"}>
                      {imageSrc && (
                        <div className="position-relative">
                          <Card.Img variant="top" src={imageSrc} alt={feature.name} />
                          {featurePhotos.length > 1 && (
                            <>
                              <Button
                                variant="light"
                                size="sm"
                                className="position-absolute top-50 start-0 translate-middle-y ms-2"
                                onClick={() => shiftPhoto(feature.id, featurePhotos.length, -1)}
                              >
                                {"<"}
                              </Button>
                              <Button
                                variant="light"
                                size="sm"
                                className="position-absolute top-50 end-0 translate-middle-y me-2"
                                onClick={() => shiftPhoto(feature.id, featurePhotos.length, 1)}
                              >
                                {">"}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                      <Card.Body>
                        <Card.Title className="d-flex justify-content-between align-items-start">
                          <span>{feature.name}</span>
                          {isSelected && <Badge bg="primary">Selected</Badge>}
                        </Card.Title>
                        {feature.description && <Card.Text>{feature.description}</Card.Text>}
                        <Form.Check
                          type="checkbox"
                          id={`feature-${feature.id}`}
                          label="Use for ranking"
                          checked={isSelected}
                          onChange={() => toggleFeature(feature.id)}
                        />
                      </Card.Body>
                    </Card>
                  </Col>
                )
              })
            )}
          </Row>
        </Card.Body>
      </Card>

      <Card className="mt-3">
        <Card.Header className="text-center">
          <h2>Fault ranking</h2>
        </Card.Header>
        <Card.Body>
          {selectedFeatureIds.length === 0 ? (
            <div className="text-center text-muted">Select one or more features to see matching faults.</div>
          ) : ranking.length === 0 ? (
            <div className="text-center text-muted">No faults match the selected features.</div>
          ) : (
            <Table responsive bordered hover>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Fault</th>
                  <th>Matches</th>
                  <th>Matched Features</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((fault, index) => (
                  <tr key={fault.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="fw-semibold">{fault.name}</div>
                      {fault.description && <div className="text-muted">{fault.description}</div>}
                    </td>
                    <td>{fault.matchCount}</td>
                    <td>
                      {fault.matchedFeatureIds.map((featureId) => (
                        <Badge key={featureId} bg="secondary" className="me-1">
                          {featuresById.get(featureId)?.name ?? `Feature ${featureId}`}
                        </Badge>
                      ))}
                    </td>
                    <td className="text-end">
                      <Button as={Link} to={`/fault/${fault.id}`} size="sm" variant="outline-primary">
                        View details
                      </Button>
                    </td>
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
