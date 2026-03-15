import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { translateCategory, type Transaction } from './store';
import { saveAs } from 'file-saver';

export function exportToCSV(transactions: Transaction[], language: 'en' | 'fr' = 'en', filename = 'ClariFi_History') {
  console.log('ClariFi: Exporting CSV...');
  
  const data = transactions.map(t => ({
    Date: t.date,
    Description: t.text,
    Amount: t.amount,
    Category: t.category,
    Type: t.amount > 0 ? (language === 'fr' ? 'Revenu' : 'Income') : (language === 'fr' ? 'Depense' : 'Expense'),
  }));
  
  const csv = Papa.unparse(data);
  const csvWithBom = '\uFEFF' + csv;
  const fileName = `${filename}.csv`;

  // Provide explicit MIME type
  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, fileName);
}

export function exportToPDF(transactions: Transaction[], language: 'en' | 'fr' = 'en', filename = 'ClariFi_History') {
  console.log('ClariFi: Exporting PDF...');
  
  const doc = new jsPDF();
  const title = language === 'fr' ? 'Relevé de transactions' : 'Transaction Statement';
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  const headers = language === 'fr' 
    ? [['Date', 'Description', 'Catégorie', 'Montant ($)']]
    : [['Date', 'Description', 'Category', 'Amount ($)']];
    
  const data = transactions.map(t => [
    t.date,
    t.text,
    translateCategory(t.category, language),
    t.amount.toFixed(2)
  ]);

  autoTable(doc, {
    startY: 30,
    head: headers,
    body: data,
    theme: 'grid',
    headStyles: { fillColor: [124, 58, 237] },
  });

  const fileName = `${filename}.pdf`;

  // Convert jsPDF document explicitly to a blob before saving
  const blob = new Blob([doc.output('blob')], { type: 'application/pdf' });
  saveAs(blob, fileName);
}