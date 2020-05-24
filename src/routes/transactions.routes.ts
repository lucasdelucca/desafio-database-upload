import csv from 'csvtojson';
import { Router } from 'express';
import multer from 'multer';
import toStream from 'tostream';
import { getCustomRepository } from 'typeorm';

import multerConfig from '../config/upload';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
// import DeleteTransactionService from '../services/DeleteTransactionService';
// import ImportTransactionsService from '../services/ImportTransactionsService';

const transactionsRouter = Router();

transactionsRouter.get('/', async (request, response) => {
  const transactionsRepository = getCustomRepository(TransactionsRepository);
  const transactions = await transactionsRepository.find();
  const balance = await transactionsRepository.getBalance();

  return response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request, response) => {
  const { title, value, type, category } = request.body;

  const createTransaction = new CreateTransactionService();
  const transaction = await createTransaction.execute({
    title,
    value,
    type,
    category,
  });

  return response.json(transaction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;

  const transactionsRepository = getCustomRepository(TransactionsRepository);
  await transactionsRepository.delete(id);

  return response.status(204).send();
});

const upload = multer(multerConfig);

interface TransactionCSVItem {
  title: string;
  type: 'income' | 'outcome';
  value: string;
  category: string;
}

transactionsRouter.post(
  '/import',
  upload.single('file'),
  async (request, response) => {
    const readCSVStream = toStream(request.file.buffer);

    const transactions: Transaction[] = [];

    await csv()
      .fromStream(readCSVStream)
      .subscribe(
        async ({ title, type, value, category }: TransactionCSVItem) => {
          const createTransaction = new CreateTransactionService();
          const transaction = await createTransaction.execute({
            title,
            value: parseInt(value, 10),
            type,
            category,
          });

          transactions.push(transaction);
        },
      );

    return response.json(transactions);
  },
);

export default transactionsRouter;
