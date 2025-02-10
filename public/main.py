import pandas as pd

csv_data = pd.read_csv("population-density.csv") # 251
geojson_data = pd.read_json("countries.geojson") # 255

csv_countries = csv_data.Code.unique()
geojson_countries = [data["properties"]["ISO_A3"] for data in geojson_data.features]

print(geojson_countries)

series1 = pd.Series(geojson_countries)
series2 = pd.Series(csv_countries)

missing_in_2 = series1[~series1.isin(series2)]
print(missing_in_2.to_list());

print(csv_data['Population density'].mean())
print(csv_data['Population density'].median())
print(csv_data['Population density'].mode())
