using Casus_Security.Model;
using Newtonsoft.Json;

internal class IPFileGenerator
{
	private string filePath;

	public IPFileGenerator(string filePath)
	{
		this.filePath = filePath;
	}

	public void GenerateIPFile(List<IP> ipList)
	{
		try
		{
			string json = JsonConvert.SerializeObject(ipList, Newtonsoft.Json.Formatting.Indented);

			File.WriteAllText(filePath, json);
			Console.WriteLine("JSON file successfully generated at: " + filePath);
		}
		catch (Exception ex)
		{
			Console.WriteLine("An error occurred while generating the JSON file: " + ex.Message);
		}
	}
}
