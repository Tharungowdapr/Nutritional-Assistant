import pandas as pd
excel_path = "./data/AaharAI_NutriSync_Enhanced.xlsx"
xls = pd.ExcelFile(excel_path)
print(xls.sheet_names)
