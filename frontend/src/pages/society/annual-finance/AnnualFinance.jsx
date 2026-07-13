import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { expenseAPI, societyAnnualCollectionAPI, societyFlatAPI } from '../../../api/endpoints'
import { formatCurrency, formatDate } from '../../../utils/format'
import { Shell, SummaryGrid } from '../../DashboardRouter'
import { CollectionModal } from './CollectionModal'
import { ExpenseModal } from './ExpenseModal'
import { useAuthStore } from '../../../store/authStore'

const currentFinancialYear=()=>{const d=new Date(),y=d.getMonth()<3?d.getFullYear()-1:d.getFullYear();return `${y}-${y+1}`}
export const AnnualFinance=()=>{
 const currentAccount=useAuthStore(state=>state.currentAccount),canWrite=currentAccount?.role!=='MEMBER'
 const [financialYear,setFinancialYear]=useState(currentFinancialYear()),[rows,setRows]=useState([]),[flats,setFlats]=useState([]),[expenses,setExpenses]=useState([]),[activeView,setActiveView]=useState('overview'),[expensePage,setExpensePage]=useState(1),[modal,setModal]=useState(null)
 const loadCollections=()=>societyAnnualCollectionAPI.list(financialYear).then(r=>setRows(r.data||[])).catch(()=>toast.error('Unable to load collections'))
 const loadExpenses=()=>expenseAPI.getExpenses().then(r=>setExpenses(r.data||[])).catch(()=>toast.error('Unable to load expenses'))
 useEffect(()=>{loadCollections();loadExpenses();societyFlatAPI.getFlats().then(r=>setFlats(r.data||[])).catch(()=>{})},[financialYear])
 const totals=useMemo(()=>rows.reduce((a,x)=>{a.total+=Number(x.amount);a[x.collectionType]=(a[x.collectionType]||0)+Number(x.amount);return a},{total:0}),[rows]),yearStart=`${financialYear.slice(0,4)}-04-01`,yearEnd=`${financialYear.slice(5)}-03-31`
 const annualExpenses=useMemo(()=>expenses.filter(x=>x.expenseDate>=yearStart&&x.expenseDate<=yearEnd).sort((a,b)=>String(b.expenseDate).localeCompare(String(a.expenseDate))),[expenses,yearStart,yearEnd]),expenseTotal=annualExpenses.reduce((s,x)=>s+Number(x.amount||0),0),pageCount=Math.max(1,Math.ceil(annualExpenses.length/10)),visibleExpenses=annualExpenses.slice((expensePage-1)*10,expensePage*10)
 const remove=async id=>{if(!window.confirm('Delete this collection entry?'))return;try{await societyAnnualCollectionAPI.delete(id);toast.success('Collection deleted');loadCollections()}catch{toast.error('Unable to delete collection')}}
 return <Shell title="Annual Finance" eyebrow="Society module" actions={canWrite&&<div className="table-actions"><button onClick={()=>setModal('collection')}>Record Collection</button><button className="primary" onClick={()=>setModal('expense')}>Add Expense</button></div>}>
  <section className="toolbar-panel"><label>Financial year<input value={financialYear} pattern="\d{4}-\d{4}" onChange={e=>{setFinancialYear(e.target.value);setExpensePage(1)}}/></label></section>
  <div className="shared-expense-submenu">{['overview','collections','expenses'].map(x=><button key={x} className={activeView===x?'active':''} onClick={()=>setActiveView(x)}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div>
  <SummaryGrid items={[[ 'Total received',formatCurrency(totals.total) ],[ 'Total expenses',formatCurrency(expenseTotal) ],[ 'Net balance',formatCurrency(totals.total-expenseTotal) ],[ 'Maintenance',formatCurrency(totals.MAINTENANCE||0) ]]}/>
  {activeView==='overview'&&<section className="report-panel"><h2>{financialYear} summary</h2><p className="muted">Collections and expenses from 1 April {financialYear.slice(0,4)} through 31 March {financialYear.slice(5)}.</p></section>}
  {activeView==='collections'&&<div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Flat</th><th>Source</th><th>Mode</th><th>Reference</th><th className="numeric">Amount</th>{canWrite&&<th>Action</th>}</tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{formatDate(x.paymentDate)}</td><td>{x.collectionType}</td><td>{x.flatLabel||'-'}</td><td>{x.sourceName}</td><td>{x.paymentMode}</td><td>{x.referenceNumber||'-'}</td><td className="numeric">{formatCurrency(x.amount)}</td>{canWrite&&<td className="table-actions"><button onClick={()=>setModal({type:'collection',item:x})}>Edit</button><button className="danger" onClick={()=>remove(x.id)}>Delete</button></td>}</tr>)}{!rows.length&&<tr><td colSpan={canWrite?8:7} className="empty-state">No collections recorded.</td></tr>}</tbody></table></div>}
  {activeView==='expenses'&&<><div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Vendor</th><th>Payment</th><th>Status</th><th className="numeric">Amount</th>{canWrite&&<th>Action</th>}</tr></thead><tbody>{visibleExpenses.map(x=><tr key={x.id}><td>{formatDate(x.expenseDate)}</td><td>{x.categoryName||'-'}</td><td>{x.vendorName||'-'}</td><td>{x.paymentMode}</td><td><span className={`status-pill ${String(x.status).toLowerCase()}`}>{x.status}</span></td><td className="numeric">{formatCurrency(x.amount)}</td>{canWrite&&<td><button onClick={()=>setModal({type:'expense',item:x})}>Edit</button></td>}</tr>)}{!annualExpenses.length&&<tr><td colSpan={canWrite?7:6} className="empty-state">No expenses found.</td></tr>}</tbody></table></div>{pageCount>1&&<nav className="table-pagination"><button disabled={expensePage===1} onClick={()=>setExpensePage(x=>x-1)}>Previous</button><span>Page {expensePage} of {pageCount}</span><button disabled={expensePage===pageCount} onClick={()=>setExpensePage(x=>x+1)}>Next</button></nav>}</>}
  {canWrite&&<CollectionModal open={modal==='collection'||modal?.type==='collection'} collection={modal?.item} financialYear={financialYear} flats={flats} onClose={()=>setModal(null)} onSaved={()=>{loadCollections();setActiveView('collections')}}/>}
  {canWrite&&<ExpenseModal open={modal==='expense'||modal?.type==='expense'} expense={modal?.item} financialYear={financialYear} onClose={()=>setModal(null)} onSaved={()=>{loadExpenses();setActiveView('expenses')}}/>}
 </Shell>
}
