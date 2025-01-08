/*
 * @Author: garyxuan
 * @Date: 2025-01-03 18:18:13
 * @Description: 
 */
const cors = require('cors');
const express = require('express');

// 增加请求体大小限制
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors()); 