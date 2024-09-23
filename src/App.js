import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5002';

const SplitwiseApp = () => {
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState({ payer: '', amount: '', description: '' });
  const [simplifiedDebts, setSimplifiedDebts] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
      fetchExpenses(savedToken);
    }
  }, []);

  const fetchExpenses = async (authToken) => {
    try {
      const response = await axios.get(`${API_URL}/expenses`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const addExpense = async () => {
    if (newExpense.payer && newExpense.amount && newExpense.description) {
      try {
        const response = await axios.post(`${API_URL}/expenses`, newExpense, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setExpenses([...expenses, response.data]);
        setNewExpense({ payer: '', amount: '', description: '' });
      } catch (error) {
        console.error('Error adding expense:', error);
      }
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('bill', file);

    try {
      const response = await axios.post(`${API_URL}/upload-bill`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      
      const newExpense = {
        payer: 'Uploaded Bill',
        amount: 0,
        description: `Bill Image: ${response.data.filename}`
      };
      
      await addExpense(newExpense);
    } catch (error) {
      console.error('Error uploading bill:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const simplifyDebts = () => {
    const balances = {};
    expenses.forEach(expense => {
      balances[expense.payer] = (balances[expense.payer] || 0) + expense.amount;
    });

    const totalAmount = Object.values(balances).reduce((sum, balance) => sum + balance, 0);
    const averageAmount = totalAmount / Object.keys(balances).length;

    Object.keys(balances).forEach(person => {
      balances[person] -= averageAmount;
    });

    const debtors = Object.entries(balances).filter(([, balance]) => balance < 0)
      .sort(([, a], [, b]) => a - b);
    const creditors = Object.entries(balances).filter(([, balance]) => balance > 0)
      .sort(([, a], [, b]) => b - a);

    const simplifiedDebts = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const [debtor, debtAmount] = debtors[i];
      const [creditor, creditAmount] = creditors[j];
      const amount = Math.min(-debtAmount, creditAmount);

      simplifiedDebts.push({ from: debtor, to: creditor, amount: amount.toFixed(2) });

      debtors[i][1] += amount;
      creditors[j][1] -= amount;

      if (debtors[i][1] === 0) i++;
      if (creditors[j][1] === 0) j++;
    }

    setSimplifiedDebts(simplifiedDebts);
  };

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_URL}/login`, { username, password });
      setToken(response.data.token);
      localStorage.setItem('token', response.data.token);
      setIsLoggedIn(true);
      fetchExpenses(response.data.token);
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  const handleRegister = async () => {
    try {
      await axios.post(`${API_URL}/register`, { username, password });
      alert('Registered successfully. Please log in.');
    } catch (error) {
      console.error('Error registering:', error);
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setExpenses([]);
  };

  if (!isLoggedIn) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h2 className="mb-4 text-xl font-bold">Login / Register</h2>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={handleLogin}
            >
              Login
            </button>
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              onClick={handleRegister}
            >
              Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <button
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4"
        onClick={handleLogout}
      >
        Logout
      </button>
      
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="mb-4 text-xl font-bold">Add Expense</h2>
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2"
          type="text"
          placeholder="Payer"
          value={newExpense.payer}
          onChange={(e) => setNewExpense({ ...newExpense, payer: e.target.value })}
        />
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2"
          type="number"
          placeholder="Amount"
          value={newExpense.amount}
          onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
        />
        <input
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline mb-2"
          type="text"
          placeholder="Description"
          value={newExpense.description}
          onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
        />
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            onClick={addExpense}
          >
            Add Expense
          </button>
          <label className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline cursor-pointer">
            {isUploading ? 'Uploading...' : 'Upload Bill'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="mb-4 text-xl font-bold">Expenses</h2>
        {expenses.map((expense, index) => (
          <div key={index} className="mb-2">
            {expense.payer} paid ${expense.amount} for {expense.description}
          </div>
        ))}
      </div>

      <button
        className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4"
        onClick={simplifyDebts}
      >
        Simplify Debts
      </button>

      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <h2 className="mb-4 text-xl font-bold">Simplified Debts</h2>
        {simplifiedDebts.map((debt, index) => (
          <div key={index} className="mb-2">
            {debt.from} owes {debt.to} ${debt.amount}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SplitwiseApp;