import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter, Routes, Route, NavLink, Outlet } from 'react-router-dom'
import { Container, Navbar, Nav, Row, Col, ToastContainer, Toast, Card, Spinner, ListGroup, Button, Form, InputGroup, Alert } from 'react-bootstrap';
import { CapturePage } from './CapturePage';
import { DataView } from './DataView';
import { ViewRepairDetails } from './ViewRepairDetails';
import { ToastProvider } from './ToastContext'
import { useEffect, useMemo, useState } from "react"
import APIBackend from './RestAPI'
import { getApiBase } from './apiBase'

function App() {
  let [loaded, setLoaded] = useState(false)
  let [pending, setPending] = useState(false)
  let [error, setError] = useState(null)
  let [config, setConfig] = useState([])

  useEffect(() => {
    let do_load = async () => {
      setPending(true)
      let response = await APIBackend.api_get(window.location.origin + '/config/config.json');
      if (response.status === 200) {
        const raw_conf = response.payload;
        console.log("config", raw_conf)
        setConfig(raw_conf)
        setLoaded(true)
      } else {
        console.log("ERROR LOADING CONFIG")
        setError("ERROR: Unable to load configuration!")
      }
    }
    if (!loaded && !pending) {
      do_load()
    }
  }, [loaded, pending])
  if (!loaded) {
    return <Container fluid="md">
      <Card className='mt-2 text-center'>
        {error !== null ? <h1>{error}</h1> : <div><Spinner></Spinner> <h2 className='d-inline'>Loading Config</h2></div>}
      </Card>
    </Container>
  } else {
    return (

        <ToastProvider position='bottom-center'>
          <BrowserRouter>
            <Routing config={config} />
          </BrowserRouter>
        </ToastProvider>

    )
  }
}

function Routing(props) {
  let [product_list, setProductList] = useState([])

  return (
    <Routes>
      <Route path='/' element={<Base product_list={product_list} setProductList={setProductList} {...props} />}>
        <Route path='/products' element={<ProductList product_list={product_list} setProductList={setProductList} config={props.config} />} />
        <Route path='/single/:product_id' element={<CapturePage product_list={product_list} {...props} />} />
        <Route index element={<ProductList product_list={product_list} setProductList={setProductList} config={props.config} />}></Route>
        <Route path='/viewdata' element={<DataView product_list={product_list} config={props.config} />} />
        <Route path='/viewdata/:product_id' element={<DataView product_list={product_list} config={props.config} />} />
        <Route path='/fault/:fault_id' element={<ViewRepairDetails config={props.config} />} />
      </Route>
    </Routes>
  )
}

function Base({ setProductList, config }) {


  let [loaded, setLoaded] = useState(false)
  let [pending, setPending] = useState(false)
  let [error, setError] = useState(null)
  const apiBase = getApiBase(config)

  const setProductFromDjango = async () => {
    setPending(true)
      let response = await APIBackend.api_get(apiBase + '/products/');
      if (response.status === 200) {
        setProductList(response.payload)
        setLoaded(true)
      } else {
        console.error("Unable to load list of products")
        setError("Unable to load list of products - please try refresh")
      }
  }

    const setReasonFromDjango = async () => {
    setPending(true)
      let response = await APIBackend.api_get(apiBase + '/products/');
      if (response.status === 200) {
        setProductList(response.payload)
        console.log(response.payload)
        setLoaded(true)
      } else {
        console.error("Unable to load list of products")
        setError("Unable to load list of products - please try refresh")
      }
  }


  useEffect(() => {
    let do_load = async () => {
      setProductFromDjango()
    }
    if (!loaded && !pending) {
      do_load()
    }
  }, [loaded, pending, config, setProductList])

  if (!loaded) {
    return <Container fluid="md">
      <Card className='mt-2 text-center'>
        {error !== null ? <h1>{error}</h1> : <div><Spinner></Spinner> <h2 className='d-inline'>Loading products</h2></div>}
      </Card>
    </Container>
  } else {
    return (
      <Container fluid className="vh-100 p-0 d-flex flex-column">
        {/* <div id='header'> */}
        <Navbar sticky="top" bg="secondary" variant="dark" expand="md">
          <Container fluid>
            <Navbar.Brand href="/">
              Recording Repair App
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" className='mb-2' />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav variant="pills" className="me-auto">
                <BSNavLink to='/products'>Home Page (Products)</BSNavLink>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
        {/* </div> */}
        <Container fluid className="flex-grow-1 main-background px-1 pt-2 px-sm-2">
          <Row className="h-100 m-0 d-flex justify-content-center pt-4 pb-5">
            <Col md={10} lg={8}>
              <Outlet />
            </Col>
          </Row>
        </Container>
      </Container>
    )
  }
}

function BSNavLink({ children, className, ...props }) {
  return <NavLink className={({ isActive }) => (isActive ? ("nav-link active " + className) : ("nav-link " + className))} {...props}>{children}</NavLink>
}

function ProductList({ product_list, setProductList, config }) {
  const [newProductName, setNewProductName] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const apiBase = getApiBase(config)

  const onCreateProduct = async (event) => {
    event.preventDefault()
    const trimmedName = newProductName.trim()
    if (!trimmedName || creating) {
      return
    }
    setCreating(true)
    setCreateError(null)
    let response = await APIBackend.api_post(apiBase + '/products/', { name: trimmedName })
    if (response.status === 201 || response.status === 200) {
      const created = response.payload
      setProductList(prev => {
        const updated = [...prev, created]
        updated.sort((a, b) => (a.id || 0) - (b.id || 0))
        return updated
      })
      setNewProductName("")
    } else {
      setCreateError("Unable to add product - please try again")
      console.error("Unable to add product", response)
    }
    setCreating(false)
  }

  return <Container fluid="md">
    <Card className='mt-2'>
      <Card.Header className='text-center'><h1>{config?.location_page?.title}</h1></Card.Header>
      <Card.Body>
        <Form onSubmit={onCreateProduct} className="mb-3">
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="New product name"
              value={newProductName}
              onChange={(event) => setNewProductName(event.target.value)}
              aria-label="New product name"
            />
            <Button type="submit" disabled={creating || newProductName.trim() === ""}>
              {creating ? "Adding..." : "Add Product"}
            </Button>
          </InputGroup>
          {createError ? <Alert variant="danger" className="mt-2 mb-0">{createError}</Alert> : null}
        </Form>
        <ListGroup>
          {product_list.map(item => (
            <ListGroup.Item key={item.id} className="d-flex justify-content-between align-items-baseline">
              {item.name}
              <span className='flex-shrink-0'>
                <NavLink className="mx-2" to={"/single/" + item.id}>
                  <Button>Add Data</Button>
                </NavLink>
                <NavLink className="mx-2" to={"/viewdata/" + item.id}>
                  <Button variant="outline-secondary">View Data</Button>
                </NavLink>
      
              </span>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  </Container>
}

export default App;
