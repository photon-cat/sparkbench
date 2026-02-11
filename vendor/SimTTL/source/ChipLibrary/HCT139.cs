// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;

namespace ChipLibrary
{
	/// <summary>
	/// Class definition of the logic chip 74HCT139.
	/// </summary>
	public class HCT139 : BaseElement
	{
		// Datashet: https://www.ti.com/lit/ds/symlink/cd74hc139.pdf

		private const double TYP_PROPAGATION_DELAY = 14;

		#region Input Pins
		public Pin I1Gn;
		public Pin I1A;
		public Pin I1B;

		public Pin I2Gn;
		public Pin I2A;
		public Pin I2B;
		#endregion Input Pins

		#region Output Pins
		public Pin O1Y0;
		public Pin O1Y1;
		public Pin O1Y2;
		public Pin O1Y3;

		public Pin O2Y0;
		public Pin O2Y1;
		public Pin O2Y2;
		public Pin O2Y3;
		#endregion Output Pins

		#region Constructors
		/// <summary>
		/// Creates the instance without net connections.
		/// </summary>
		/// <param name="Name">Name of the element.</param>
		public HCT139(string Name) : this(Name, null, null, null, null, null, null) { }

		/// <summary>
		/// Creates the instance including input net connections.
		/// </summary>
		/// <param name="Name">Name of the element.</param>
		public HCT139(string Name, Net NetI1Gn, Net NetI1A, Net NetI1B, Net NetI2Gn, Net NetI2A, Net NetI2B) : base(Name)
		{
			this.Power[0] = new Pin(this, "VCC", "16");
			this.Ground[0] = new Pin(this, "GND", "8");

			this.I1Gn = new Pin(this, "1Gn", "1", LineMode.In, SignalState.L, NetI1Gn);
			this.I1A = new Pin(this, "1A", "2", LineMode.In, SignalState.L, NetI1A);
			this.I1B = new Pin(this, "1B", "3", LineMode.In, SignalState.L, NetI1B);

			this.I2Gn = new Pin(this, "2Gn", "15", LineMode.In, SignalState.L, NetI2Gn);
			this.I2A = new Pin(this, "2A", "14", LineMode.In, SignalState.L, NetI2A);
			this.I2B = new Pin(this, "2B", "13", LineMode.In, SignalState.L, NetI2B);

			this.O1Y0 = new Pin(this, "1Y0", "4", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
			this.O1Y1 = new Pin(this, "1Y1", "5", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
			this.O1Y2 = new Pin(this, "1Y2", "6", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
			this.O1Y3 = new Pin(this, "1Y3", "7", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);

			this.O2Y0 = new Pin(this, "2Y0", "12", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
			this.O2Y1 = new Pin(this, "2Y1", "11", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
			this.O2Y2 = new Pin(this, "2Y2", "10", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
			this.O2Y3 = new Pin(this, "2Y3", "9", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);

			Inputs = new Pin[2][];
			SetPinArray(Inputs, 0, new Pin[] { this.I1Gn, this.I1A, this.I1B });
			SetPinArray(Inputs, 1, new Pin[] { this.I2Gn, this.I2A, this.I2B });

			Outputs = new Pin[8][];
			SetPinArray(Outputs, 0, this.O1Y0);
			SetPinArray(Outputs, 1, this.O1Y1);
			SetPinArray(Outputs, 2, this.O1Y2);
			SetPinArray(Outputs, 3, this.O1Y3);
			SetPinArray(Outputs, 4, this.O2Y0);
			SetPinArray(Outputs, 5, this.O2Y1);
			SetPinArray(Outputs, 6, this.O2Y2);
			SetPinArray(Outputs, 7, this.O2Y3);
		}
		#endregion Constructors

		#region Public Methods
		/// <summary>
		/// Update outputs and inputs to the simulation time.
		/// </summary>
		/// <param name="Time">Time value to update to.</param>
		public override void Update(double Time)
		{
			base.Update(Time);

			//if ((G0n.State == SignalState.Z) || (G1n.State == SignalState.Z) || (G2.State == SignalState.Z) || (A0.State == SignalState.Z) || (A1.State == SignalState.Z) || (A2.State == SignalState.Z) ||
			//	(G0n.State == SignalState.U) || (G1n.State == SignalState.U) || (G2.State == SignalState.U) || (A0.State == SignalState.U) || (A1.State == SignalState.U) || (A2.State == SignalState.U))
			//{
			//	Y0.NewOutState = SignalState.U;
			//	Y1.NewOutState = SignalState.U;
			//	Y2.NewOutState = SignalState.U;
			//	Y3.NewOutState = SignalState.U;
			//	Y4.NewOutState = SignalState.U;
			//	Y5.NewOutState = SignalState.U;
			//	Y6.NewOutState = SignalState.U;
			//	Y7.NewOutState = SignalState.U;
			//	return;
			//}


			if (I1Gn.State == SignalState.L)
			{
				if (I1B.State == SignalState.L)
				{
					if (I1A.State == SignalState.L)
					{
						O1Y0.NewOutState = SignalState.L;
						O1Y1.NewOutState = SignalState.H;
					}
					else
					{
						O1Y0.NewOutState = SignalState.H;
						O1Y1.NewOutState = SignalState.L;
					}
					O1Y2.NewOutState = SignalState.H;
					O1Y3.NewOutState = SignalState.H;
				}
				else if (I1B.State == SignalState.H)
				{
					O1Y0.NewOutState = SignalState.H;
					O1Y1.NewOutState = SignalState.H;
					if (I1A.State == SignalState.L)
					{
						O1Y2.NewOutState = SignalState.L;
						O1Y3.NewOutState = SignalState.H;
					}
					else
					{
						O1Y2.NewOutState = SignalState.H;
						O1Y3.NewOutState = SignalState.L;
					}
				}
			}
			else
			{
				O1Y0.NewOutState = SignalState.H;
				O1Y1.NewOutState = SignalState.H;
				O1Y2.NewOutState = SignalState.H;
				O1Y3.NewOutState = SignalState.H;
			}

			if (I2Gn.State == SignalState.L)
			{
				if (I2B.State == SignalState.L)
				{
					if (I2A.State == SignalState.L)
					{
						O2Y0.NewOutState = SignalState.L;
						O2Y1.NewOutState = SignalState.H;
					}
					else
					{
						O2Y0.NewOutState = SignalState.H;
						O2Y1.NewOutState = SignalState.L;
					}
					O2Y2.NewOutState = SignalState.H;
					O2Y3.NewOutState = SignalState.H;
				}
				else if (I2B.State == SignalState.H)
				{
					O2Y0.NewOutState = SignalState.H;
					O2Y1.NewOutState = SignalState.H;
					if (I2A.State == SignalState.L)
					{
						O2Y2.NewOutState = SignalState.L;
						O2Y3.NewOutState = SignalState.H;
					}
					else
					{
						O2Y2.NewOutState = SignalState.H;
						O2Y3.NewOutState = SignalState.L;
					}
				}
			}
			else
			{
				O2Y0.NewOutState = SignalState.H;
				O2Y1.NewOutState = SignalState.H;
				O2Y2.NewOutState = SignalState.H;
				O2Y3.NewOutState = SignalState.H;
			}
		}
        #endregion Public Methods

    }
}
