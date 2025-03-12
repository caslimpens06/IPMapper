namespace Casus_Security.Model
{
	internal class IP
	{
		private string _protocol;
		private string _localAddress;
		private string _foreignAddress;
		private string _state;

		public string Protocol
		{
			get { return _protocol; }
			set { _protocol = value; }
		}

		public string LocalAddress
		{
			get { return _localAddress; }
			set { _localAddress = value; }
		}

		public string ForeignAddress
		{
			get { return _foreignAddress; }
			set { _foreignAddress = value; }
		}

		public string State
		{
			get { return _state; }
			set { _state = value; }
		}

		public IP(string protocol, string localaddress, string foreignaddress, string state)
		{
			_protocol = protocol;
			_localAddress = localaddress;
			_foreignAddress = foreignaddress;
			_state = state;
		}
	}
}
