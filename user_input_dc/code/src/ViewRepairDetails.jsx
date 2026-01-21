import { useEffect, useMemo, useState } from "react"
import { Container, Card, Spinner, Table, Badge, Form } from "react-bootstrap"
import { useParams } from "react-router-dom"
import APIBackend from "./RestAPI"
import { getApiBase } from "./apiBase"

export function ViewRepairDetails({ config }) {
  const [loaded, setLoaded] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const [fault, setFault] = useState(null)
  const [features, setFeatures] = useState([])
  const [repairResults, setRepairResults] = useState([])
  const [outcomeFilter, setOutcomeFilter] = useState("all")

  const params = useParams()
  const faultId = Number(params.fault_id)

  const apiBase = getApiBase(config)

  useEffect(() => {
    const doLoad = async () => {
      setPending(true)
      try {
        const [faultRes, featureRes, resultRes] = await Promise.all([
          APIBackend.api_get(apiBase + `/faults/${faultId}/`),
          APIBackend.api_get(apiBase + "/features/"),
          APIBackend.api_get(apiBase + "/repair-results/"),
        ])
        if (faultRes.status === 200 && featureRes.status === 200 && resultRes.status === 200) {
          setFault(faultRes.payload)
          setFeatures(featureRes.payload)
          setRepairResults(resultRes.payload)
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

  const formatActions = (items) => {
    if (!items || items.length === 0) {
      return "-"
    }
    return items.map((item) => item.name).join(", ")
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
        </Card.Header>
        <Card.Body>
          {fault?.description && <div className="text-muted mb-2">{fault.description}</div>}
          {fault?.features?.length ? (
            <div className="mb-3">
              {fault.features.map((featureId) => (
                <Badge key={featureId} bg="secondary" className="me-1">
                  {featuresById.get(featureId)?.name ?? `Feature ${featureId}`}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-muted mb-3">No linked features.</div>
          )}

          <h2 className="h4">Repair results</h2>
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
                  <th>Repair actions</th>
                  <th>Reasons not repaired</th>
                </tr>
              </thead>
              <tbody>
                {visibleResults.map((result) => (
                  <tr key={result.id}>
                    <td>{result.date ?? "-"}</td>
                    <td>{result.type ?? "-"}</td>
                    <td>{formatActions(result.repair_action_details)}</td>
                    <td>{formatActions(result.reason_not_repaired_details)}</td>
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
