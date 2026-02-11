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
    /// Class definition of the logic chip 74HCT138.
    /// </summary>
	public class HCT138 : BaseElement
	{
        // Datashet: https://www.ti.com/lit/ds/symlink/sn74hct138.pdf

        private const double TYP_PROPAGATION_DELAY = 18;

        #region Input Pins
        public Pin G0n;
		public Pin G1n;
		public Pin G2;

		public Pin A0;
		public Pin A1;
		public Pin A2;
        #endregion Input Pins

        #region Output Pins
        public Pin Y0;
		public Pin Y1;
		public Pin Y2;
		public Pin Y3;
		public Pin Y4;
		public Pin Y5;
		public Pin Y6;
		public Pin Y7;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT138(string Name) : this(Name, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT138(string Name, Net NetG0n, Net NetG1n, Net NetG2, Net NetA0, Net NetA1, Net NetA2) : base(Name)
		{
            this.Power[0] = new Pin(this, "VCC", "16");
            this.Ground[0] = new Pin(this, "GND", "8");

			this.G0n = new Pin(this, "G0n", "4", LineMode.In, SignalState.L, NetG0n);
			this.G1n = new Pin(this, "G1n", "5", LineMode.In, SignalState.L, NetG1n);
			this.G2 = new Pin(this, "G2", "6", LineMode.In, SignalState.L, NetG2);
																		
			this.A0 = new Pin(this, "A0", "1", LineMode.In, SignalState.L, NetA0);
			this.A1 = new Pin(this, "A1", "2", LineMode.In, SignalState.L, NetA1);
			this.A2 = new Pin(this, "A2", "3", LineMode.In, SignalState.L, NetA2);

			this.Y0 = new Pin(this, "Y0", "15", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
			this.Y1 = new Pin(this, "Y1", "14", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
			this.Y2 = new Pin(this, "Y2", "13", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
			this.Y3 = new Pin(this, "Y3", "12", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
			this.Y4 = new Pin(this, "Y4", "11", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
			this.Y5 = new Pin(this, "Y5", "10", LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
			this.Y6 = new Pin(this, "Y6", "9",  LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);
			this.Y7 = new Pin(this, "Y7", "7",  LineMode.Out, SignalState.H, TYP_PROPAGATION_DELAY);

			Inputs = new Pin[2][];
			SetPinArray(Inputs, 0, new Pin[] { this.G0n, this.G1n, this.G2 });
			SetPinArray(Inputs, 1, new Pin[] { this.A0,  this.A1,  this.A2 });

			Outputs = new Pin[8][];
			SetPinArray(Outputs, 0, this.Y0);
			SetPinArray(Outputs, 1, this.Y1);
			SetPinArray(Outputs, 2, this.Y2);
			SetPinArray(Outputs, 3, this.Y3);
			SetPinArray(Outputs, 4, this.Y4);
			SetPinArray(Outputs, 5, this.Y5);
			SetPinArray(Outputs, 6, this.Y6);
			SetPinArray(Outputs, 7, this.Y7);
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


			if ((G0n.State == SignalState.L) && (G1n.State == SignalState.L) && (G2.State == SignalState.H))
			{
				if (A2.State == SignalState.L)
				{
					if (A1.State == SignalState.L)
					{
						if (A0.State == SignalState.L)
						{
							Y0.NewOutState = SignalState.L;
							Y1.NewOutState = SignalState.H;
						}
						else
						{
							Y0.NewOutState = SignalState.H;
							Y1.NewOutState = SignalState.L;
						}
						Y2.NewOutState = SignalState.H;
						Y3.NewOutState = SignalState.H;
					}
					else if (A1.State == SignalState.H)
					{
						Y0.NewOutState = SignalState.H;
						Y1.NewOutState = SignalState.H;
						if (A0.State == SignalState.L)
						{
							Y2.NewOutState = SignalState.L;
							Y3.NewOutState = SignalState.H;
						}
						else
						{
							Y2.NewOutState = SignalState.H;
							Y3.NewOutState = SignalState.L;
						}
					}
					Y4.NewOutState = SignalState.H;
					Y5.NewOutState = SignalState.H;
					Y6.NewOutState = SignalState.H;
					Y7.NewOutState = SignalState.H;
				}
				else
				{
					Y0.NewOutState = SignalState.H;
					Y1.NewOutState = SignalState.H;
					Y2.NewOutState = SignalState.H;
					Y3.NewOutState = SignalState.H;

					if (A1.State == SignalState.L)
					{
						if (A0.State == SignalState.L)
						{
							Y4.NewOutState = SignalState.L;
							Y5.NewOutState = SignalState.H;
						}
						else
						{
							Y4.NewOutState = SignalState.H;
							Y5.NewOutState = SignalState.L;
						}
						Y6.NewOutState = SignalState.H;
						Y7.NewOutState = SignalState.H;
					}
					else if (A1.State == SignalState.H)
					{
						Y4.NewOutState = SignalState.H;
						Y5.NewOutState = SignalState.H;

						if (A0.State == SignalState.L)
						{
							Y6.NewOutState = SignalState.L;
							Y7.NewOutState = SignalState.H;
						}
						else
						{
							Y6.NewOutState = SignalState.H;
							Y7.NewOutState = SignalState.L;
						}
					}
				}
			}
			else
			{
				Y0.NewOutState = SignalState.H;
				Y1.NewOutState = SignalState.H;
				Y2.NewOutState = SignalState.H;
				Y3.NewOutState = SignalState.H;
				Y4.NewOutState = SignalState.H;
				Y5.NewOutState = SignalState.H;
				Y6.NewOutState = SignalState.H;
				Y7.NewOutState = SignalState.H;
			}

		}
        #endregion Public Methods

    }
}
