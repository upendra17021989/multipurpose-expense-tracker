import { Navbar } from '../components/Navbar'

export const Dashboard = () => {
  return (
    <div>
      <Navbar />
      <main style={styles.container}>
        <h1>Welcome to Expense Tracker Dashboard</h1>
        <p>Select an option from the menu to get started</p>
      </main>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '2rem auto',
    padding: '0 1rem'
  }
}
