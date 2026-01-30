import { useEffect, useMemo, useState, useRef } from "react"
import { Container, Pagination, Card, Col, Row, Button, Table, Spinner } from 'react-bootstrap'
import { useParams } from 'react-router-dom'
import APIBackend from './RestAPI'
import * as dayjs from 'dayjs'
import { useToastDispatch, add_toast } from "./ToastContext";
import { ListSelectModal } from "./ListSelectModal";
import { ExtraModal } from "./ExtraModal"
import { getApiBase } from "./apiBase"

//todo reasons modification page (download new config file - save in right place)
//todo cancel

const STATUS = { repair: "Repaired",  part_repair: "Partial repair", not_repair: "Not repaired",}
const RESULT_TYPE = {
  [STATUS.repair]: "R",
  [STATUS.part_repair]: "P",
  [STATUS.not_repair]: "N",
}



export function CapturePage({ config, product_list }) {
  const inputRef = useRef(null);
  const currentDataRef = useRef(null)

  let params = useParams();
  const product_id = Number(params.product_id)
  let product = product_list?.find(elem => elem.id === product_id)


  let [loaded, setLoaded] = useState(false)
  let [pending, setPending] = useState(false)
  let [error, setError] = useState(null)
  let [showFeatureModal, setShowFeatureModal] = useState(false);
  let [showFaultModal, setShowFaultModal] = useState(false);
  let [showReasonsNotRepairModal, setShowReasonsNotRepairModal] = useState(false);
  let [showRepairActionModal, setShowRepairActionModal] = useState(false);
  let [showExtraModal, setShowExtraModal] = useState(false);

  let [modalType, setModalType] = useState(STATUS.repair)
  let [eventList, setEventList] = useState([])
  let [selectedFeatureIds, setSelectedFeatureIds] = useState([])
  let [modalTitle, setModalTitle] = useState("")
  let toast_dispatch = useToastDispatch()
  let url = getApiBase(config)
  let [currentData, setCurrentData] = useState(null) //({product_id: product_id})
  let [textName, setTextName] = useState("")
  const resetCurrentData = () => {
    const nextData = { product_id: product_id }
    currentDataRef.current = nextData
    setCurrentData(nextData)
  }

  const normalizeRepairResultPayload = (data, resultType) => {
    const payload = { ...data }
    if (payload.feature && !payload.fault_features) {
      payload.fault_features = payload.feature
    }
    delete payload.feature
    if (!payload.type) {
      payload.type = RESULT_TYPE[resultType]
    }
    if (!payload.text) {
      payload.text = resultType
    }
    if (Array.isArray(payload.fault_diagnosed)) {
      payload.fault_diagnosed = payload.fault_diagnosed[0] ?? null
    }
    return payload
  }

  useEffect(() => {

    let do_load = async () => {
      setPending(true)
      
      setLoaded(true)
    }
    if (!loaded && !pending) {
      do_load()
    }
  }, [loaded, pending, config, product_id])

  useEffect(() => {
    resetCurrentData()
  }, [product_id])

  useEffect(() => {
    currentDataRef.current = currentData
  }, [currentData])

  const handleModalClose = (setter) => () => {
    resetCurrentData()
    setter(false)
  }

  //todo: only add to event list if sent
  const handle_event = async (event_type, reason) => {


    if(event_type===STATUS.repair){
      reason="repair";
    }

    let base_message = { product: product?.name ?? "unspecified", outcome:event_type, count: 1}
    
    base_message = { ...base_message, reason: reason }
    let timestamp = dayjs()

    let topic = event_type
    if (!Array.isArray(topic))
      topic = [topic]

    topic.unshift("single");

    topic.unshift(product?.name ? product.name : "unspecified");

    let payload = { ...base_message, timestamp: timestamp.format() }

    try {
      setEventList(prev => [{ ...base_message, timestamp: timestamp }, ...prev])
      add_toast(toast_dispatch, { header: "Sent"})
    }
    catch (err) {
      console.error(err)
      add_toast(toast_dispatch, { header: "Error", body: err })
    }
  }

  const handleButtonClick = (value) => {
    // starts the process of collecting form data from the user based on response
    // show first page of modal
    resetCurrentData()
    setShowFeatureModal(true)
    setModalType(value)
    if (value === STATUS.not_repair) {
      setModalTitle("Details for Not Repaired product")
      setTextName(product?.name + " - Not Repaired")
    } else if (value === STATUS.part_repair) {
      setModalTitle("Details on  Partially Repaired product")
      setTextName(product?.name + " - Partially Repaired")
    } else {
      setModalTitle("Details on Repaired product")
      setTextName(product?.name + " - Repaired")
    }

    if (value === STATUS.repair) {
      handle_event(value)
    } 
  }





  const handleSubmitSelection = async (returnInfo) => {
    // add new data
    let newData = { ...(currentDataRef.current ?? {}), ...returnInfo }
    console.log("Returned data:", returnInfo)
    console.log("New data:", newData)
    currentDataRef.current = newData
    setCurrentData(newData)

    if (showExtraModal) {
      // final submit sent the final repair data and reset modals
      setShowExtraModal(false)
      newData = { ...newData, 
                type: RESULT_TYPE[modalType],
              text: textName,
              date: dayjs().format("YYYY-MM-DD")}

      // send data to backend
      console.log("Submitting final data:", newData)
      handle_event(modalType, newData)
      try {
      const payload = normalizeRepairResultPayload(newData, modalType)
      const response = await APIBackend.api_post(url + "/repair-results/", payload)
      if (response.status >= 200 && response.status < 300) {
        resetCurrentData()
        console.log("Submitted data successfully")
      } else {
        setError(`Unable to add item (status ${response.status})`)
      }
      } catch (err) {
        setError(err?.message ?? "Unable to add item")
      }
    }

    if (showReasonsNotRepairModal) {
      // last modal before submitting, show extra modal
      setShowReasonsNotRepairModal(false)
      setShowExtraModal(true)
    }
    
    if (showRepairActionModal) {
      // show reasons not repaired or final extra 
      setShowRepairActionModal(false)
      if (modalType === STATUS.part_repair || modalType === STATUS.not_repair) {
        setShowReasonsNotRepairModal(true)
      }else{
        setShowExtraModal(true)
      }
    }

    if (showFaultModal) {
      // show reaosns not repaired or repair actions depending on type
      setShowFaultModal(false)
      if (modalType === STATUS.repair || modalType === STATUS.part_repair) {
        setShowRepairActionModal(true)
      } else if (modalType === STATUS.not_repair) {
        setShowReasonsNotRepairModal(true)
      }
    }
    
    if (showFeatureModal) {
      // show second modal 
      setShowFeatureModal(false)
      setShowFaultModal(true)
    }
    
  }



  if (!loaded) {
    return <Container fluid="md">
      <Card className='mt-2 text-center'>
        {error !== null ? <h1>{error}</h1> : <Spinner></Spinner>}
      </Card>
    </Container>
  } else {
    return <>
      <Card className='mt-2'>
        <Card.Header className='text-center'>
          <h1>{product?.name}</h1>
        </Card.Header>
        <Card.Body>
          <ButtonBar handleButtonClick={handleButtonClick} />
        </Card.Body>
      </Card>
      <ListSelectModal
        show={showFeatureModal}
        title={modalTitle}
        topic={"Fault features"}
        handleClose={handleModalClose(setShowFeatureModal)}
        fullscreen={config?.capture_page?.fullscreen_modal}
        addEndpoint={url + '/features/'}
        photoEndpoint={url + '/photos/'}
        photoRelationKey="feature_id"
        current_data={currentData}
        editableKeys={['name', 'description']}
        tag_to_store = {"fault_features"}
        photoOption = {true}
        multiSelect={true}
        onSelectionChange={setSelectedFeatureIds}
        onSelectionSubmit={handleSubmitSelection}
      />
      <ListSelectModal
        show={showFaultModal}
        title={modalTitle}
        topic={"Fault Diagnosed"}
        handleClose={handleModalClose(setShowFaultModal)}
        fullscreen={config?.capture_page?.fullscreen_modal}
        addEndpoint={url + '/faults/'}
        current_data={currentData}
        editableKeys={['name', 'description']}
        tag_to_store = {"fault_diagnosed"}
        photoOption = {false}
        multiSelect={false}
        onSelectionChange={setSelectedFeatureIds}
        onSelectionSubmit={handleSubmitSelection}
      />
      <ListSelectModal
        show={showRepairActionModal}
        title={modalTitle}
        topic={"Repair Actions Taken"}
        handleClose={handleModalClose(setShowRepairActionModal)}
        fullscreen={config?.capture_page?.fullscreen_modal}
        addEndpoint={url + '/repair-actions/'}
        current_data={currentData}
        editableKeys={['name', 'description']}
        tag_to_store = {"repair_action"}
        photoOption = {false}
        multiSelect={true}
        onSelectionChange={setSelectedFeatureIds}
        onSelectionSubmit={handleSubmitSelection}
      />
      <ListSelectModal
        show={showReasonsNotRepairModal} 
        title={modalTitle}
        topic={"Repair Actions Taken"}
        handleClose={handleModalClose(setShowReasonsNotRepairModal)}
        fullscreen={config?.capture_page?.fullscreen_modal}
        addEndpoint={url + '/reasons-not-repaired/'}
        current_data={currentData}
        editableKeys={['name', 'description']}
        tag_to_store = {"reason_not_repaired"}
        photoOption = {false}
        multiSelect={true}
        onSelectionChange={setSelectedFeatureIds}
        onSelectionSubmit={handleSubmitSelection}
      />
      <ExtraModal
        show={showExtraModal}
        title={modalTitle}
        handleClose={handleModalClose(setShowExtraModal)}
        fullscreen={config?.capture_page?.fullscreen_modal}
        onSelectionSubmit={handleSubmitSelection}
      />
    </>
  }
}

function ButtonBar({ handleButtonClick }) {
  return <Container fluid>
    <Row className='gx-2 gy-1'>
      <Col xs={12} sm={4} className="d-grid px-1">
        <Button variant="success" size="lg" onClick={() => handleButtonClick(STATUS.repair)}>Repaired</Button>
      </Col>
       <Col xs={12} sm={4} className="d-grid px-1">
        <Button variant="warning" size="lg" onClick={() => handleButtonClick(STATUS.part_repair)}>Partial Repair</Button>
      </Col>
      <Col xs={12} sm={4} className="d-grid px-1">
        <Button variant="danger" size="lg" onClick={() => handleButtonClick(STATUS.not_repair)}>Not Repaired</Button>
      </Col>
     
    </Row>
  </Container>
}
